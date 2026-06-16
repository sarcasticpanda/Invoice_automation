from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_groq import ChatGroq
from langchain_chroma import Chroma
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from .structure_outputs import *
from .prompts import *

from langchain_google_genai import ChatGoogleGenerativeAI

class Agents():
    def __init__(self):
        # Choose which LLMs to use for each agent
        print("Initializing Agents...")
        # LLM provider is configurable via LLM_PROVIDER in .env (default: groq,
        # which has a far more generous free tier than Gemini's ~20/day).
        from .llm import get_llm
        llama = get_llm(temperature=0.1)
        
        print("Loading HuggingFaceEmbeddings...")
        # QA assistant chat — using local HuggingFace embeddings (free, no API limits)
        from langchain_community.embeddings import HuggingFaceEmbeddings
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        print("Initializing Chroma DB...")
        vectorstore = Chroma(persist_directory="db_local", embedding_function=embeddings)
        print("Initializing retriever...")
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

        # Categorize email chain
        email_category_prompt = PromptTemplate(
            template=CATEGORIZE_EMAIL_PROMPT, 
            input_variables=["email"]
        )
        self.categorize_email = (
            email_category_prompt | 
            llama.with_structured_output(CategorizeEmailOutput)
        )

        # Sentiment analysis chain
        sentiment_prompt = PromptTemplate(
            template=SENTIMENT_ANALYSIS_PROMPT,
            input_variables=["email"]
        )
        self.analyze_sentiment = (
            sentiment_prompt |
            llama.with_structured_output(SentimentOutput)
        )

        # Used to design queries for RAG retrieval
        generate_query_prompt = PromptTemplate(
            template=GENERATE_RAG_QUERIES_PROMPT, 
            input_variables=["email"]
        )
        self.design_rag_queries = (
            generate_query_prompt | 
            llama.with_structured_output(RAGQueriesOutput)
        )
        
        # Generate answer to queries using RAG
        qa_prompt = ChatPromptTemplate.from_template(GENERATE_RAG_ANSWER_PROMPT)
        self.generate_rag_answer = (
            {"context": retriever, "question": RunnablePassthrough()}
            | qa_prompt
            | llama
            | StrOutputParser()
        )

        # Used to write a draft email based on category and related informations
        writer_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", EMAIL_WRITER_PROMPT),
                MessagesPlaceholder("history"),
                ("human", "{email_information}")
            ]
        )
        self.email_writer = (
            writer_prompt | 
            llama.with_structured_output(WriterOutput)
        )

        # Verify the generated email
        proofreader_prompt = PromptTemplate(
            template=EMAIL_PROOFREADER_PROMPT, 
            input_variables=["initial_email", "generated_email"]
        )
        self.email_proofreader = (
            proofreader_prompt | 
            llama.with_structured_output(ProofReaderOutput) 
        )