import os
import shutil
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

print("Loading & Chunking Docs...")
loader = DirectoryLoader("./data/", glob="*.txt", loader_cls=TextLoader)
docs = loader.load()
print(f"Loaded {len(docs)} documents.")

doc_splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)
doc_chunks = doc_splitter.split_documents(docs)

print("Loading local HF embeddings...")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

print("Creating vector embeddings & saving to ChromaDB...")
if os.path.exists("db_local"):
    shutil.rmtree("db_local")

# NOTE: no collection_name -> use Chroma's default "langchain" collection,
# which is what app_server.py, agents.py and the chat retriever all read.
# (Previously this wrote to "invoice_docs", which the app never queried.)
vectorstore = Chroma.from_documents(
    documents=doc_chunks,
    embedding=embeddings,
    persist_directory="db_local"
)
print(f"Done populating db_local with {vectorstore._collection.count()} chunks.")
