import os
from datetime import datetime
from colorama import Fore, Style
from .agents import Agents
from .tools.GmailTools import GmailToolsClass
from .state import GraphState, Email
from . import history_store


# Simple JSON-based history store
HISTORY_FILE = "email_history.json"

def _load_history():
    return history_store.load_history()

def _save_history(history):
    history_store.save_history(history)

def _log_conversation(email_data: dict):
    """Log a conversation to history."""
    history_store.append_history(email_data)


class Nodes:
    def __init__(self):
        self.agents = Agents()
        self.gmail_tools = GmailToolsClass()

    def load_new_emails(self, state: GraphState) -> GraphState:
        """Loads new emails from Gmail and updates the state."""
        print(Fore.YELLOW + "Loading new emails...\n" + Style.RESET_ALL)
        recent_emails = self.gmail_tools.fetch_unanswered_emails()
        # Cap per run (configurable via MAX_EMAILS_PER_RUN). Groq's generous free
        # tier means we can process the whole recent batch, so the default is high.
        limit = int(os.getenv("MAX_EMAILS_PER_RUN", "25"))
        recent_emails = recent_emails[:limit]
        # Trim very long bodies (newsletters can be ~10k chars) so we stay under
        # the LLM provider's tokens-per-minute limit. Real support questions are
        # short, so they're unaffected. Configurable via MAX_EMAIL_BODY_CHARS.
        max_body = int(os.getenv("MAX_EMAIL_BODY_CHARS", "2500"))
        for em in recent_emails:
            if em.get("body") and len(em["body"]) > max_body:
                em["body"] = em["body"][:max_body]
        print(Fore.YELLOW + f"Processing {len(recent_emails)} email(s) this run.\n" + Style.RESET_ALL)
        emails = [Email(**email) for email in recent_emails]
        return {"emails": emails}

    def check_new_emails(self, state: GraphState) -> str:
        """Checks if there are new emails to process."""
        if len(state['emails']) == 0:
            print(Fore.RED + "No new emails" + Style.RESET_ALL)
            return "empty"
        else:
            print(Fore.GREEN + "New emails to process" + Style.RESET_ALL)
            return "process"
        
    def is_email_inbox_empty(self, state: GraphState) -> GraphState:
        return state

    def categorize_email(self, state: GraphState) -> GraphState:
        """Categorizes the current email using the categorize_email agent."""
        print(Fore.YELLOW + "Checking email category...\n" + Style.RESET_ALL)
        
        # Get the last email
        current_email = state["emails"][-1]
        result = self.agents.categorize_email.invoke({"email": current_email.body})
        print(Fore.MAGENTA + f"Email category: {result.category.value}" + Style.RESET_ALL)
        thread_context = history_store.build_thread_context(current_email.threadId)
        
        return {
            "email_category": result.category.value,
            "current_email": current_email,
            "thread_context": thread_context,
        }

    def analyze_sentiment(self, state: GraphState) -> GraphState:
        """Analyzes sentiment of the current email."""
        print(Fore.YELLOW + "Analyzing email sentiment...\n" + Style.RESET_ALL)
        
        current_email = state["current_email"]
        result = self.agents.analyze_sentiment.invoke({"email": current_email.body})
        
        print(Fore.CYAN + f"Sentiment: {result.sentiment.value} (confidence: {result.confidence:.0%})" + Style.RESET_ALL)
        print(Fore.CYAN + f"Summary: {result.summary}" + Style.RESET_ALL)
        
        return {
            "email_sentiment": result.sentiment.value,
            "email_sentiment_confidence": result.confidence,
            "email_sentiment_summary": result.summary
        }

    def route_email_based_on_category(self, state: GraphState) -> str:
        """Routes the email based on its category."""
        print(Fore.YELLOW + "Routing email based on category...\n" + Style.RESET_ALL)
        category = state["email_category"]
        if category == "product_enquiry":
            return "product related"
        elif category == "unrelated":
            return "unrelated"
        else:
            return "not product related"

    def construct_rag_queries(self, state: GraphState) -> GraphState:
        """Constructs RAG queries based on the email content."""
        print(Fore.YELLOW + "Designing RAG query...\n" + Style.RESET_ALL)
        email_content = state["current_email"].body
        query_result = self.agents.design_rag_queries.invoke({"email": email_content})
        # Cap to 2 queries — fewer retrievals, faster, less token use.
        return {"rag_queries": (query_result.queries or [])[:2]}

    def retrieve_from_rag(self, state: GraphState) -> GraphState:
        """Retrieves relevant document snippets for the queries. Uses vector
        search only (no per-query LLM synthesis) — the writer reads the raw
        snippets, which is much faster and avoids extra LLM calls."""
        print(Fore.YELLOW + "Retrieving information from internal knowledge...\n" + Style.RESET_ALL)
        seen, chunks = set(), []
        for query in state["rag_queries"]:
            for doc in self.agents.retriever.invoke(query):
                key = doc.page_content[:60]
                if key not in seen:
                    seen.add(key)
                    chunks.append(doc.page_content)
        return {"retrieved_documents": "\n\n".join(chunks) or "No relevant documents found."}

    def write_draft_email(self, state: GraphState) -> GraphState:
        """Writes a draft email based on the current email and retrieved information."""
        print(Fore.YELLOW + "Writing draft email...\n" + Style.RESET_ALL)
        
        # Format input to the writer agent
        inputs = (
            f'# **EMAIL CATEGORY:** {state["email_category"]}\n\n'
            f'# **SENTIMENT:** {state.get("email_sentiment", "unknown")} '
            f'(confidence: {state.get("email_sentiment_confidence", 0):.0%})\n\n'
            f'# **EMAIL CONTENT:**\n{state["current_email"].body}\n\n'
            f'# **PREVIOUS THREAD CONTEXT:**\n{state.get("thread_context", "")}\n\n'
            f'# **INFORMATION:**\n{state.get("retrieved_documents", "")}' 
        )
        
        # Get messages history for current email
        writer_messages = state.get('writer_messages', [])
        
        # Write email
        draft_result = self.agents.email_writer.invoke({
            "email_information": inputs,
            "history": writer_messages
        })
        email = draft_result.email
        trials = state.get('trials', 0) + 1

        # Append writer's draft to the message list
        writer_messages.append(f"**Draft {trials}:**\n{email}")

        return {
            "generated_email": email, 
            "trials": trials,
            "writer_messages": writer_messages
        }

    def verify_generated_email(self, state: GraphState) -> GraphState:
        """Verifies the generated email using the proofreader agent."""
        print(Fore.YELLOW + "Verifying generated email...\n" + Style.RESET_ALL)
        review = self.agents.email_proofreader.invoke({
            "initial_email": state["current_email"].body,
            "generated_email": state["generated_email"],
        })

        writer_messages = state.get('writer_messages', [])
        writer_messages.append(f"**Proofreader Feedback:**\n{review.feedback}")

        return {
            "sendable": review.send,
            "writer_messages": writer_messages
        }

    def _human_review_reason(self, state: GraphState) -> str:
        """Risky emails get a human; clearly-safe ones can auto-send.
        Risky = complaints, negative/urgent sentiment, or low confidence."""
        reasons = []
        category = state.get("email_category", "")
        sentiment = state.get("email_sentiment", "")
        confidence = state.get("email_sentiment_confidence", 0) or 0
        body = (state.get("current_email").body if state.get("current_email") else "").lower()
        if category == "customer_complaint":
            reasons.append("customer complaint")
        if sentiment in ("negative", "urgent"):
            reasons.append(f"{sentiment} sentiment")
        if confidence < 0.6:
            reasons.append("low sentiment confidence")
        if any(term in body for term in history_store.SENSITIVE_TERMS):
            reasons.append("sensitive topic")
        if state.get("thread_context") and "Previous reply at" in state.get("thread_context", ""):
            reasons.append("existing thread with prior AI/human reply")
        return "; ".join(dict.fromkeys(reasons))

    def _needs_human_review(self, state: GraphState) -> bool:
        return bool(self._human_review_reason(state))

    def route_after_review(self, state: GraphState) -> str:
        """After proofreading: rewrite if not good; else auto-send (safe) or
        queue for human review (risky), based on the run mode."""
        if not state["sendable"]:
            if state["trials"] >= 3:
                print(Fore.RED + "Max trials reached — stopping this email." + Style.RESET_ALL)
                state["emails"].pop()
                state["writer_messages"] = []
                return "stop"
            print(Fore.RED + "Email not good — rewriting..." + Style.RESET_ALL)
            return "rewrite"

        # Approved by proofreader — decide where it goes.
        state["emails"].pop()
        state["writer_messages"] = []
        mode = state.get("mode", "smart")
        if mode == "auto":
            decision = "auto_send"
        elif mode == "review":
            decision = "needs_review"
        else:  # smart
            reason = self._human_review_reason(state)
            decision = "needs_review" if reason else "auto_send"
            state["intervention_reason"] = reason
        label = "needs HUMAN review" if decision == "needs_review" else "AUTO-SENDING (safe)"
        print(Fore.GREEN + f"Email approved -> {label}" + Style.RESET_ALL)
        return decision

    def must_rewrite(self, state: GraphState) -> str:
        """Determines if the email needs to be rewritten based on the review and trial count."""
        email_sendable = state["sendable"]
        if email_sendable:
            print(Fore.GREEN + "Email is good, ready to be sent!!!" + Style.RESET_ALL)
            state["emails"].pop()
            state["writer_messages"] = []
            return "send"
        elif state["trials"] >= 3:
            print(Fore.RED + "Email is not good, we reached max trials must stop!!!" + Style.RESET_ALL)
            state["emails"].pop()
            state["writer_messages"] = []
            return "stop"
        else:
            print(Fore.RED + "Email is not good, must rewrite it..." + Style.RESET_ALL)
            return "rewrite"

    def send_email_response(self, state: GraphState) -> GraphState:
        """Auto-sends the email response directly using Gmail and logs to history."""
        print(Fore.GREEN + "AUTO-SENDING email response...\n" + Style.RESET_ALL)
        self.gmail_tools.send_reply(state["current_email"], state["generated_email"])
        
        # Log to conversation history
        _log_conversation({
            "timestamp": datetime.now().isoformat(),
            "sender_email": state["current_email"].sender,
            "sender_subject": state["current_email"].subject,
            "incoming_body": state["current_email"].body,
            "category": state["email_category"],
            "sentiment": state.get("email_sentiment", "unknown"),
            "sentiment_confidence": state.get("email_sentiment_confidence", 0),
            "sentiment_summary": state.get("email_sentiment_summary", ""),
            "generated_reply": state["generated_email"],
            "status": "auto_sent",
            "requires_human": False,
            "human_reason": "",
            "decision_reason": "Safe enough for AI auto-send after proofreading",
            "priority": history_store.priority_for_entry({
                "category": state["email_category"],
                "sentiment": state.get("email_sentiment", "unknown"),
                "sentiment_confidence": state.get("email_sentiment_confidence", 0),
                "incoming_body": state["current_email"].body,
            }),
            "thread_id": state["current_email"].threadId,
            "message_id": state["current_email"].messageId,
            "references": state["current_email"].references,
        })

        return {"retrieved_documents": "", "trials": 0}

    def create_draft_response(self, state: GraphState) -> GraphState:
        """Creates a draft response in Gmail and logs to history."""
        print(Fore.YELLOW + "Creating draft email...\n" + Style.RESET_ALL)
        self.gmail_tools.create_draft_reply(state["current_email"], state["generated_email"])
        
        # Log to conversation history
        _log_conversation({
            "timestamp": datetime.now().isoformat(),
            "sender_email": state["current_email"].sender,
            "sender_subject": state["current_email"].subject,
            "incoming_body": state["current_email"].body,
            "category": state["email_category"],
            "sentiment": state.get("email_sentiment", "unknown"),
            "sentiment_confidence": state.get("email_sentiment_confidence", 0),
            "sentiment_summary": state.get("email_sentiment_summary", ""),
            "generated_reply": state["generated_email"],
            "status": "draft",
            "requires_human": True,
            "human_reason": state.get("intervention_reason") or "Run mode requires human review",
            "decision_reason": state.get("intervention_reason") or "Queued for human review",
            "priority": history_store.priority_for_entry({
                "category": state["email_category"],
                "sentiment": state.get("email_sentiment", "unknown"),
                "sentiment_confidence": state.get("email_sentiment_confidence", 0),
                "incoming_body": state["current_email"].body,
            }),
            "thread_id": state["current_email"].threadId,
            "message_id": state["current_email"].messageId,
            "references": state["current_email"].references,
        })
        
        return {"retrieved_documents": "", "trials": 0}
    
    def skip_unrelated_email(self, state):
        """Skip unrelated email and remove from emails list."""
        print("Skipping unrelated email...\n")
        
        current_email = state["emails"][-1]
        # Log skipped emails too
        _log_conversation({
            "timestamp": datetime.now().isoformat(),
            "sender_email": current_email.sender,
            "sender_subject": current_email.subject,
            "incoming_body": current_email.body,
            "category": "unrelated",
            "sentiment": "neutral",
            "sentiment_confidence": 0,
            "sentiment_summary": "Skipped — unrelated email",
            "generated_reply": "",
            "status": "skipped",
            "requires_human": False,
            "human_reason": "",
            "decision_reason": "Unrelated email skipped by classifier",
            "priority": "low",
            "thread_id": current_email.threadId,
        })
        
        state["emails"].pop()
        return state
