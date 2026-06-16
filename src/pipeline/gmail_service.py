import os
import time
from dotenv import load_dotenv
from src.tools.GmailTools import GmailToolsClass
from src.pipeline.agents import app as ai_pipeline
import psycopg2
from urllib.parse import quote_plus

load_dotenv()

def get_db_connection():
    password = "Saubhagya@15"
    encoded_password = quote_plus(password)
    conn_str = f"postgresql://postgres.opfzqagvbglgqanjnkca:{encoded_password}@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
    return psycopg2.connect(conn_str)

def run_gmail_automation():
    gmail = GmailToolsClass()
    my_email = os.getenv("MY_EMAIL")
    human_email = os.getenv("HUMAN_AGENT_EMAIL", my_email) # Fallback to own email

    print(f"Starting Gmail Automation for {my_email}...")
    
    while True:
        try:
            # Fetch unread emails from the last 1 hour
            new_emails = gmail.fetch_recent_emails(max_results=10)
            
            if not new_emails:
                print("No new emails. Sleeping for 60 seconds...")
            else:
                for email in new_emails:
                    print(f"Processing email from: {email['sender']}")
                    
                    # Initialize state
                    initial_state = {
                        "email_id": "",
                        "email_from": email['sender'],
                        "email_subject": email['subject'],
                        "email_body": email['body'],
                        "category": "",
                        "sentiment_label": "",
                        "sentiment_score": 0.0,
                        "sentiment_triggers": [],
                        "priority": "",
                        "rag_context": "",
                        "draft_response": "",
                        "suggested_action": "",
                        "reeval_score": 0,
                        "status": "processing",
                        "escalated": False,
                        "final_response": ""
                    }
                    
                    # Run through LangGraph pipeline
                    final_state = ai_pipeline.invoke(initial_state)
                    
                    # Handle post-pipeline actions
                    if final_state['status'] == 'discarded':
                        print(f"Email from {email['sender']} discarded as spam.")
                        continue
                        
                    if final_state['sentiment_label'] == 'Angry' and final_state['priority'] == 'Urgent':
                        print(f"ESCALATING ticket {final_state['email_id']} for {email['sender']}")
                        # Send alert to human agent (drafting a simple email)
                        alert_body = f"URGENT ESCALATION\n\nFrom: {email['sender']}\nSubject: {email['subject']}\n\nAI Analysis: {final_state['sentiment_label']} sentiment, {final_state['category']} category.\n\nDraft AI Response:\n{final_state['draft_response']}"
                        gmail.send_email(
                            to=human_email,
                            subject=f"URGENT: Escalation for {email['sender']}",
                            body=alert_body
                        )
                    else:
                        print(f"AUTO-SENDING response to {email['sender']}")
                        # Actually send the reply
                        gmail.send_email(
                            to=email['sender'],
                            subject=f"Re: {email['subject']}",
                            body=final_state['draft_response']
                        )
                        
                        # Update status in DB
                        conn = get_db_connection()
                        cur = conn.cursor()
                        cur.execute("UPDATE tickets SET status = 'auto-sent' WHERE id = %s", (final_state['email_id'],))
                        conn.commit()
                        cur.close()
                        conn.close()

            time.sleep(60)
            
        except Exception as e:
            print(f"Error in automation loop: {e}")
            time.sleep(60)

if __name__ == "__main__":
    run_gmail_automation()
