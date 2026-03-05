# How to Run

## Prerequisites

- Python 3.7+
- Groq api key
- Google Gemini api key (for embeddings)
- Gmail API credentials
- Necessary Python libraries (listed in requirements.txt)

## Setup

1. Create and activate a virtual environment:
   sh
   python -m venv venv
   source venv/bin/activate  # On Windows use venv\Scripts\activate
   

2. Install the required packages:
   sh
   pip install -r requirements.txt
   

3. Set up environment variables:
   Create a .env file in the root directory of the project:
   env
   MY_EMAIL=your_email@gmail.com
   GROQ_API_KEY=your_groq_api_key
   GOOGLE_API_KEY=your_gemini_api_key
   

4. Ensure Gmail API is enabled:
   Follow [this guide](https://developers.google.com/gmail/api/quickstart/python) to enable Gmail API and obtain your credentials.

## Running the Application

1. Start the workflow:
   sh
   python main.py
   

2. Deploy as API:
   sh
   python deploy_api.py
   
   The workflow api will be running on localhost:8000.
