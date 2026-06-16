import os
from typing import List, Dict, Any, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv
import psycopg2
from urllib.parse import quote_plus
import json

load_dotenv()

# --- State Definition ---
class AgentState(TypedDict):
    email_id: str
    email_from: str
    email_subject: str
    email_body: str
    category: str  # billing / technical / general
    sentiment_label: str  # Angry / Frustrated / Neutral / Happy
    sentiment_score: float
    sentiment_triggers: List[str]
    priority: str  # Urgent / Normal / Low
    rag_context: str
    draft_response: str
    suggested_action: str
    reeval_score: int
    status: str
    escalated: bool
    final_response: str

# --- Models ---
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

# --- Helper Functions ---
def get_db_connection():
    password = "Saubhagya@15"
    encoded_password = quote_plus(password)
    # Using the pooler URL for better performance in the pipeline
    conn_str = f"postgresql://postgres.opfzqagvbglgqanjnkca:{encoded_password}@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
    return psycopg2.connect(conn_str)

# --- Nodes ---

def validate_email(state: AgentState):
    print("--- NODE: VALIDATE EMAIL ---")
    prompt = ChatPromptTemplate.from_template("""
    Analyze the following email and decide if it is a legitimate customer support query or spam/noise.
    Email Subject: {subject}
    Email Body: {body}
    
    Respond with a JSON object: {{"is_legitimate": true/false, "reason": "..."}}
    """)
    chain = prompt | llm
    result = chain.invoke({"subject": state['email_subject'], "body": state['email_body']})
    data = json.loads(result.content)
    
    if not data['is_legitimate']:
        return {"status": "discarded", "escalated": False}
    return {"status": "validating"}

def categorize_email(state: AgentState):
    print("--- NODE: CATEGORIZE EMAIL ---")
    prompt = ChatPromptTemplate.from_template("""
    Classify the following email into one of these categories: billing, technical, or general.
    Subject: {subject}
    Body: {body}
    
    Respond with ONLY the category name.
    """)
    chain = prompt | llm
    category = chain.invoke({"subject": state['email_subject'], "body": state['email_body']}).content.strip().lower()
    return {"category": category}

def analyze_sentiment(state: AgentState):
    print("--- NODE: ANALYZE SENTIMENT ---")
    prompt = ChatPromptTemplate.from_template("""
    Analyze the sentiment of this email. 
    Return a JSON object with:
    - sentiment_label: "Angry", "Frustrated", "Neutral", or "Happy"
    - sentiment_score: a float from -1.0 (very negative) to 1.0 (very positive)
    - triggers: a list of specific phrases that caused this score.
    
    Email Body: {body}
    """)
    chain = prompt | llm
    result = chain.invoke({"body": state['email_body']})
    data = json.loads(result.content)
    return {
        "sentiment_label": data['sentiment_label'],
        "sentiment_score": data['sentiment_score'],
        "sentiment_triggers": data['triggers']
    }

def assign_priority(state: AgentState):
    print("--- NODE: ASSIGN PRIORITY ---")
    category = state['category']
    sentiment = state['sentiment_label']
    body = state['email_body'].lower()
    
    priority = "Normal"
    
    # Urgent rules
    if sentiment in ["Angry", "Frustrated"] and category in ["billing", "technical"]:
        priority = "Urgent"
    elif any(word in body for word in ["legal", "lawsuit", "sue", "outage", "down", "lost data", "security"]):
        priority = "Urgent"
    elif sentiment == "Happy":
        priority = "Low"
    
    return {"priority": priority}

def rag_retrieve(state: AgentState):
    print("--- NODE: RAG RETRIEVAL ---")
    query = f"{state['email_subject']} {state['email_body']}"
    query_vector = embeddings.embed_query(query)
    
    # Serialize Python list to pgvector string format
    vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Use the match_chunks function with explicit cast
    cur.execute("SELECT chunk_text FROM match_chunks(%s::vector, 0.4::float, 3::int)", (vector_str,))
    rows = cur.fetchall()
    context = "\n\n".join([row[0] for row in rows])
    
    cur.close()
    conn.close()
    
    return {"rag_context": context if context else "No specific policy found."}

def generate_response(state: AgentState):
    print("--- NODE: GENERATE RESPONSE ---")
    prompt = ChatPromptTemplate.from_template("""
    You are a professional customer support agent for InvoiceFlow. 
    Write a helpful, professional email response based on the company policies provided in the context.
    
    CUSTOMER EMAIL:
    {body}
    
    COMPANY POLICIES (CONTEXT):
    {context}
    
    TONE GUIDELINE:
    The customer is {sentiment}. Your tone should be {tone_instruction}.
    
    Respond with the email body only.
    """)
    
    tone_map = {
        "Angry": "extremely calm, empathetic, and de-escalating",
        "Frustrated": "patient and very helpful",
        "Neutral": "professional and efficient",
        "Happy": "friendly and enthusiastic"
    }
    
    chain = prompt | llm
    response = chain.invoke({
        "body": state['email_body'],
        "context": state['rag_context'],
        "sentiment": state['sentiment_label'],
        "tone_instruction": tone_map.get(state['sentiment_label'], "professional")
    }).content
    
    return {"draft_response": response}

def suggest_action(state: AgentState):
    print("--- NODE: SUGGEST ACTION ---")
    prompt = ChatPromptTemplate.from_template("""
    Based on the following ticket, suggest a single next action for the agent: 
    Options: refund, escalate, follow-up, close
    
    Email: {body}
    Category: {category}
    Sentiment: {sentiment}
    
    Respond with ONLY the action name.
    """)
    chain = prompt | llm
    action = chain.invoke({
        "body": state['email_body'],
        "category": state['category'],
        "sentiment": state['sentiment_label']
    }).content.strip().lower()
    return {"suggested_action": action}

def reeval_response(state: AgentState):
    print("--- NODE: RE-EVALUATE RESPONSE ---")
    prompt = ChatPromptTemplate.from_template("""
    Score the following draft response from 1 to 10 based on accuracy, tone, and completeness.
    Respond with ONLY the number.
    
    Draft: {draft}
    Context: {context}
    Customer Need: {body}
    """)
    chain = prompt | llm
    score_str = chain.invoke({
        "draft": state['draft_response'],
        "context": state['rag_context'],
        "body": state['email_body']
    }).content.strip()
    
    try:
        score = int(score_str)
    except:
        score = 8 # Default if LLM fails format
        
    return {"reeval_score": score}

def save_ticket_to_db(state: AgentState):
    print("--- NODE: SAVE TO DB ---")
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Prepare the data
    cur.execute("""
    INSERT INTO tickets (
        email_from, email_subject, email_body, category, 
        sentiment_label, sentiment_score, sentiment_triggers, 
        priority, rag_context, draft_response, suggested_action, status
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING id;
    """, (
        state['email_from'], state['email_subject'], state['email_body'], state['category'],
        state['sentiment_label'], state['sentiment_score'], state['sentiment_triggers'],
        state['priority'], state['rag_context'], state['draft_response'], state['suggested_action'], state['status']
    ))
    ticket_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"email_id": str(ticket_id)}

# --- Graph Logic ---

def route_decision(state: AgentState):
    if state['status'] == "discarded":
        return "end"
    if state['sentiment_label'] == "Angry" and state['priority'] == "Urgent":
        return "escalate"
    if state['reeval_score'] < 7:
        return "regenerate"
    return "auto_send"

# --- Building the Graph ---
workflow = StateGraph(AgentState)

workflow.add_node("validate", validate_email)
workflow.add_node("categorize", categorize_email)
workflow.add_node("sentiment", analyze_sentiment)
workflow.add_node("priority", assign_priority)
workflow.add_node("rag", rag_retrieve)
workflow.add_node("generate", generate_response)
workflow.add_node("action", suggest_action)
workflow.add_node("reevaluate", reeval_response)
workflow.add_node("save", save_ticket_to_db)

# Simple linear flow for initial steps
workflow.set_entry_point("validate")
workflow.add_edge("validate", "categorize")
workflow.add_edge("categorize", "sentiment")
workflow.add_edge("sentiment", "priority")
workflow.add_edge("priority", "rag")
workflow.add_edge("rag", "generate")
workflow.add_edge("generate", "action")
workflow.add_edge("action", "reevaluate")
workflow.add_edge("reevaluate", "save")

# Routing after save
workflow.add_conditional_edges(
    "save",
    route_decision,
    {
        "end": END,
        "escalate": END, # We'll handle escalation logic in a separate node or later
        "regenerate": "generate",
        "auto_send": END
    }
)

app = workflow.compile()
