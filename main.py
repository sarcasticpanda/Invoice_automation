from colorama import Fore, Style
from src.graph import Workflow
from dotenv import load_dotenv
import sys

# Load all env variables
load_dotenv()

# config 
config = {'recursion_limit': 100}

# Parse run mode:
#   smart  (default) — auto-send safe replies, queue risky ones for human review
#   auto             — send everything automatically  (--auto-send)
#   review           — queue everything for human review (--no-auto-send)
mode = "smart"
if "--no-auto-send" in sys.argv or "--review" in sys.argv:
    mode = "review"
elif "--auto-send" in sys.argv or "--auto" in sys.argv:
    mode = "auto"
elif "--smart" in sys.argv:
    mode = "smart"

auto_send = mode != "review"
workflow = Workflow(auto_send=auto_send)
app = workflow.app

initial_state = {
    "emails": [],
    "current_email": {
      "id": "",
      "threadId": "",
      "messageId": "",
      "references": "",
      "sender": "",
      "subject": "",
      "body": ""
    },
    "email_category": "",
    "email_sentiment": "",
    "email_sentiment_confidence": 0.0,
    "email_sentiment_summary": "",
    "generated_email": "",
    "rag_queries": [],
    "retrieved_documents": "",
    "thread_context": "",
    "intervention_reason": "",
    "writer_messages": [],
    "sendable": False,
    "trials": 0,
    "auto_send": auto_send,
    "mode": mode
}

# Run the automation
print(Fore.GREEN + "Starting InvoiceFlow AI Pipeline..." + Style.RESET_ALL)
print(Fore.GREEN + f"Mode: {mode.upper()} "
      + {"smart": "(auto-send safe, queue risky for review)",
         "auto": "(send everything)",
         "review": "(queue everything for review)"}[mode] + Style.RESET_ALL)
try:
    for output in app.stream(initial_state, config):
        for key, value in output.items():
            print(Fore.CYAN + f"Finished running: {key}:" + Style.RESET_ALL)
    print(Fore.GREEN + "\nPipeline complete." + Style.RESET_ALL)
except Exception as e:
    msg = str(e)
    if "RESOURCE_EXHAUSTED" in msg or "429" in msg or "rate limit" in msg.lower():
        # Rate/quota hit — stop cleanly. Emails already handled this run are saved.
        print(Fore.YELLOW + "\nStopped early: AI provider rate/quota limit reached. "
              "Already-processed emails are saved. Wait a minute and run again, or "
              "raise the limit (the free Groq tier resets quickly)." + Style.RESET_ALL)
    else:
        print(Fore.RED + f"\nPipeline stopped on an error: {msg[:300]}" + Style.RESET_ALL)
