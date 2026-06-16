from pydantic import BaseModel, Field
from typing import List
from enum import Enum

# **Categorize Email Output**
class EmailCategory(str, Enum):
    product_enquiry = "product_enquiry"
    customer_complaint = "customer_complaint"
    customer_feedback = "customer_feedback"
    unrelated = "unrelated"

class CategorizeEmailOutput(BaseModel):
    category: EmailCategory = Field(
        ..., 
        description="The category assigned to the email, indicating its type based on predefined rules."
    )

# **Sentiment Analysis Output**
class SentimentLevel(str, Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"
    urgent = "urgent"

class SentimentOutput(BaseModel):
    sentiment: SentimentLevel = Field(
        ...,
        description="The emotional tone of the email."
    )
    confidence: float = Field(
        ...,
        description="Confidence score between 0.0 and 1.0 for the sentiment classification."
    )
    summary: str = Field(
        ...,
        description="A one-sentence summary of the sender's emotional state and intent."
    )

# **RAG Query Output**
class RAGQueriesOutput(BaseModel):
    queries: List[str] = Field(
        ..., 
        description="A list of up to three questions representing the customer's intent, based on their email."
    )

# **Email Writer Output**
class WriterOutput(BaseModel):
    email: str = Field(
        ..., 
        description="The draft email written in response to the customer's inquiry, adhering to company tone and standards."
    )

# **Proofreader Email Output**
class ProofReaderOutput(BaseModel):
    feedback: str = Field(
        ..., 
        description="Detailed feedback explaining why the email is or is not sendable."
    )
    send: bool = Field(
        ..., 
        description="Indicates whether the email is ready to be sent (true) or requires rewriting (false)."
    )
