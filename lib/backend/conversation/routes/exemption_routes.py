# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import Dict
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from conversation_store import get_chat_history_store
from .types import StoreDecisionTreeInput

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
