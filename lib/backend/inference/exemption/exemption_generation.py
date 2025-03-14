from francis_toolkit.types import EmbeddingModel
from francis_toolkit.utils import invoke_lambda_function
from aws_lambda_powertools import Logger, Tracer
from francis_toolkit.utils import invoke_lambda_function
import json

from common.utils import CONVERSATION_LAMBDA_FUNC_NAME

logger = Logger()
tracer = Tracer()


@tracer.capture_method
def _generate_exemption_tree(user_query: str, exemption_config: dict, embedding_model: EmbeddingModel) -> str:
    """
    Creates an exemption decision tree based on a user query, producing a JSON
    string.
    """

    raw_json = """
    {
        "question": "Is it raining?",
        "yes": {
            "question": "Do you have an umbrella?",
            "yes": {
                "decision": "Go outside."
            },
            "no": {
                "decision": "Stay inside."
            }
        },
        "no": {
            "question": "Is it sunny?",
            "yes": {
                "decision": "Wear sunglasses."
            },
            "no": {
                "decision": "Go outside as usual."
            }
        }
    }
    """
    return raw_json


def _store_in_conversation_store(chat_id: str, user_id: str, decision_tree: str) -> None:

    request_payload = {
        "path": f"/internal/chat/{chat_id}/user/{user_id}/decision-tree",
        "httpMethod": "PUT",
        "pathParameters": {"chat_id": chat_id, "user_id": user_id},
        "body": json.dumps({"decision_tree": decision_tree}),
    }

    _ = invoke_lambda_function(CONVERSATION_LAMBDA_FUNC_NAME, request_payload)


@tracer.capture_method
def generate_exemption_tree(
    user_query: str, exemption_config: dict, embedding_model: EmbeddingModel, chat_id: str, user_id: str
) -> None:
    """
    Creates an exemption decision tree based on a user query, producing a JSON
    string.
    """
    decision_tree = _generate_exemption_tree(user_query, exemption_config, embedding_model)
    _store_in_conversation_store(chat_id=chat_id, user_id=user_id, decision_tree=decision_tree)
