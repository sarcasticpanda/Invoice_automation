from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

RAG_SEARCH_PROMPT_TEMPLATE = """
Using the following pieces of retrieved context, answer the question comprehensively and concisely.
Ensure your response fully addresses the question based on the given context.

**IMPORTANT:**
Just provide the answer and never mention or refer to having access to the external context or information in your answer.
If you are unable to determine the answer from the provided context, state 'I don't know.'

Question: {question}
Context: {context}
"""

print("Loading & Chunking Docs...")
from langchain_community.document_loaders import DirectoryLoader
loader = DirectoryLoader("./data/", glob="*.txt", loader_cls=TextLoader)
docs = loader.load()
print(f"Loaded {len(docs)} documents.")

doc_splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)
doc_chunks = doc_splitter.split_documents(docs)

print("Creating vector embeddings...")
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

print("Creating vector embeddings & saving to ChromaDB...")
import shutil, os
if os.path.exists("db"):
    shutil.rmtree("db")  # Clear old index so we start fresh
    print("Old DB cleared.")

vectorstore = Chroma.from_documents(doc_chunks, embeddings, persist_directory="db")

# Semantic vector search
vectorstore_retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# Test RAG chain
print("\nTest RAG chain...")
prompt = ChatPromptTemplate.from_template(RAG_SEARCH_PROMPT_TEMPLATE)
llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.1)

rag_chain = (
    {"context": vectorstore_retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# Test with invoice-related questions
test_queries = [
    "What is your refund policy?",
    "How do I dispute an invoice?",
    "What are your pricing plans?",
]

for query in test_queries:
    result = rag_chain.invoke(query)
    print(f"\nQ: {query}")
    print(f"A: {result}")


