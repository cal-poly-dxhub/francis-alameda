# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import Dict
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from conversation_store import get_chat_history_store
from .types import StoreDecisionTreeInput, CloseExemptionInput

tracer = Tracer()
router = Router()
logger = Logger()


@router.put("/internal/chat/<chat_id>/user/<user_id>/decision-tree")
@tracer.capture_method
def store_decision_tree(chat_id: str, user_id: str) -> Dict:
    """
    Stores a decision tree as a JSON object for a chat. Simply places it in an
    appropriate field of the conversation store, for query in exemption logic.
    """

    decision_tree = StoreDecisionTreeInput(**router.current_event.json_body).decision_tree
    store = get_chat_history_store()
    store.store_decision_tree(chat_id, user_id, decision_tree)
    return {
        "data": {
            "status": "success",
        },
    }

def reduce_tree(tree: dict, answers: list[str]) -> str:
    """
    Obtains the decision and formats it nicely.
    """

    FORMAT = "Based on your answers, you should try filling out form {}."
    answers = answers.copy()
    while answers:
        answer = answers.pop(0)
        if answer in tree:
            tree = tree[answer]
        else:
            raise ValueError("Invalid answer list for decision tree")

    if "decision" not in tree:
        raise ValueError("Decision not found in decision tree")

    return FORMAT.format(tree["decision"])


def summarize_decision_path(tree, answers):
    PREFIX = "You filled out a form: \n{}"

    path = []
    node = tree

    for answer in answers:
        if "question" in node:
            path.append(f"Q: {node['question']} → A: {answer}")
            if answer in node:
                node = node[answer]
            else:
                raise ValueError("Invalid answer list for decision tree")
        else:
            raise ValueError("Invalid answer list for decision tree")

    return PREFIX.format("\n".join(path))


@router.post("/chat/<chat_id>/exemption-tree")
@tracer.capture_method
def close_exemption(chat_id: str):
    """
    Closes an exemption reasoning process with a form, logging the form-based
    interaction in the chat history and presenting the output as a message.
    Takes a list of answers and hopes a decision tree is stored in this chat.

    body: ["answer1", "answer2", ...]
    """
    request = CloseExemptionInput(**router.current_event.json_body)
    chat_history_store = get_chat_history_store()
    user_id = router.context.get("user_id", "")

    if request.answers is None:
        chat_history_store.store_decision_tree(user_id, chat_id, None)
        return {}

    tree = chat_history_store.get_decision_tree(user_id, chat_id, parse=True)

    if not tree:
        raise ValueError("No decision tree found for this chat")

    assert isinstance(tree, dict)
    decision = reduce_tree(tree, request.answers)
    form_summary = summarize_decision_path(tree, request.answers)

    chat_history_store.store_decision_tree(user_id, chat_id, None)
    form_message = chat_history_store.create_chat_message(
        user_id=user_id, chat_id=chat_id, content=form_summary, message_type="human", tokens=0
    ).model_dump()
    decision_message = chat_history_store.create_chat_message(
        user_id=user_id, chat_id=chat_id, content=decision, message_type="ai", tokens=0
    ).model_dump()

    # TODO: inconsistent types between the ChatMessage frontend model
    # and the backend PyDantic model
    form_message["text"] = form_message.pop("content")
    decision_message["text"] = decision_message.pop("content")
    form_message["type"] = form_message.pop("messageType")
    decision_message["type"] = decision_message.pop("messageType")

    return {
        "question": form_message,
        "answer": decision_message,
        "sources": [],
        "traceData": {
            "decisionTree": tree,
            "answers": request.answers,
        },
    }


@router.get("/chat/<chat_id>/exemption-tree")
@tracer.capture_method
def get_exemption_tree(chat_id: str) -> Dict:
    """
    Returns the tax exemption decision tree for a chat, if it exists.
    """

    user_id = router.context.get("user_id", "")
    chat_history_store = get_chat_history_store()
    decision_tree = chat_history_store.get_decision_tree(user_id, chat_id)
    return {
        "decisionTree": decision_tree,
    }
