from langgraph.graph import END, StateGraph
from .state import GraphState
from .nodes import Nodes

class Workflow():
    def __init__(self, auto_send=True):
        # initiate graph state & nodes
        workflow = StateGraph(GraphState)
        nodes = Nodes()

        # define all graph nodes
        workflow.add_node("load_inbox_emails", nodes.load_new_emails)
        workflow.add_node("is_email_inbox_empty", nodes.is_email_inbox_empty)
        workflow.add_node("categorize_email", nodes.categorize_email)
        workflow.add_node("analyze_sentiment", nodes.analyze_sentiment)
        workflow.add_node("construct_rag_queries", nodes.construct_rag_queries)
        workflow.add_node("retrieve_from_rag", nodes.retrieve_from_rag)
        workflow.add_node("email_writer", nodes.write_draft_email)
        workflow.add_node("email_proofreader", nodes.verify_generated_email)
        workflow.add_node("skip_unrelated_email", nodes.skip_unrelated_email)

        # Both outcomes exist as nodes; routing decides per-email at runtime.
        # auto_send_email = send now; queue_for_review = save for human approval.
        workflow.add_node("auto_send_email", nodes.send_email_response)
        workflow.add_node("queue_for_review", nodes.create_draft_response)

        # load inbox emails
        workflow.set_entry_point("load_inbox_emails")

        # check if there are emails to process
        workflow.add_edge("load_inbox_emails", "is_email_inbox_empty")
        workflow.add_conditional_edges(
            "is_email_inbox_empty",
            nodes.check_new_emails,
            {
                "process": "categorize_email",
                "empty": END
            }
        )

        # After categorization → run sentiment analysis
        workflow.add_edge("categorize_email", "analyze_sentiment")

        # After sentiment → route based on category
        workflow.add_conditional_edges(
            "analyze_sentiment",
            nodes.route_email_based_on_category,
            {
                "product related": "construct_rag_queries",
                "not product related": "email_writer",  # Feedback or Complaint
                "unrelated": "skip_unrelated_email"
            }
        )

        # pass constructed queries to RAG chain to retrieve information
        workflow.add_edge("construct_rag_queries", "retrieve_from_rag")
        # give information to writer agent to create draft email
        workflow.add_edge("retrieve_from_rag", "email_writer")
        # proofread the generated draft email
        workflow.add_edge("email_writer", "email_proofreader")
        # After proofreading: rewrite if not good; else auto-send (safe) or
        # queue for human review (risky), decided by run mode + email risk.
        workflow.add_conditional_edges(
            "email_proofreader",
            nodes.route_after_review,
            {
                "auto_send": "auto_send_email",
                "needs_review": "queue_for_review",
                "rewrite": "email_writer",
                "stop": "categorize_email"
            }
        )

        # check if there are still emails to be processed
        workflow.add_edge("auto_send_email", "is_email_inbox_empty")
        workflow.add_edge("queue_for_review", "is_email_inbox_empty")
        workflow.add_edge("skip_unrelated_email", "is_email_inbox_empty")

        # Compile
        self.app = workflow.compile()
