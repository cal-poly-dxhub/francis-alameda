from francis_toolkit.types import EmbeddingModel
from francis_toolkit.utils import invoke_lambda_function
from aws_lambda_powertools import Logger, Tracer
from francis_toolkit.utils import invoke_lambda_function
import json
import re

from common.utils import CONVERSATION_LAMBDA_FUNC_NAME, format_documents, get_corpus_documents
from llms.models import get_llm_class

logger = Logger()
tracer = Tracer()


@tracer.capture_method
def extract_decision_tree(response: str) -> dict:
    """Extracts the decision tree JSON from the model's response."""
    match = re.search(r"<exemption_decision_tree>(.*?)</exemption_decision_tree>", response, re.DOTALL)

    if match:
        tree_str = match.group(1).strip()
        try:
            return json.loads(tree_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"Extracted content is not valid JSON: {e}")

    raise ValueError("No valid decision tree found in the response.")


@tracer.capture_method
def _generate_exemption_tree(user_query: str, exemption_config: dict, embedding_model: EmbeddingModel) -> str:
    """
    Creates an exemption decision tree based on a user query, producing a JSON
    string.
    """
    kwargs = exemption_config["modelConfig"].get("modelKwargs", {})

    # TODO: generic wrapping for this prompt?
    question = f"What tax exemptions are associated with this query?: {user_query}"
    corpus_documents = get_corpus_documents(
        question=question,
        model_ref_key=embedding_model.modelRefKey,
        corpus_limit=exemption_config["corpusLimit"],
        corpus_similarity_threshold=exemption_config["corpusSimilarityThreshold"],
    )

    context = format_documents(corpus_documents)
    kwargs["context"] = context
    kwargs["user_query"] = user_query

    llm = get_llm_class(provider=exemption_config["modelConfig"]["provider"])

    llm_response, _, _ = llm.call_text_llms(
        model_config=exemption_config["modelConfig"],
        prompt_template=exemption_config["promptTemplate"],
        prompt_variables=["user_query", "context"],
        **kwargs,
    )

    logger.info(f"TREE GENERATION - rag question: {question} llm_response: {llm_response} context: {context}")
    tree = extract_decision_tree(llm_response)

    # TODO: Validate llm_response as JSON first?
    return json.dumps(tree)


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
