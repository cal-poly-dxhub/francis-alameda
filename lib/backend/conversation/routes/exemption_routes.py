# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Literal
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from pydantic import BaseModel
from .types import InitiateExemptionInput, TraverseExemptionInput

tracer = Tracer()
router = Router()
logger = Logger()


class Question(BaseModel):
    question: str
    questionId: str
    type: Literal["list"]
    options: list


dummy_questions = [
    Question(
        question="dummyQuestion",
        questionId="0",
        type="list",
        options=["dummyOption1", "dummyOption2"],
    ),
    Question(
        question="dummyQuestion",
        questionId="1",
        type="list",
        options=["dummyOption1", "dummyOption2"],
    ),
    Question(
        question="dummyQuestion",
        questionId="2",
        type="list",
        options=["dummyOption1", "dummyOption2"],
    ),
]


@router.post("/chat/<chat_id>/init-exemption")
@tracer.capture_method(capture_response=False)
def init_chat_exemption(chat_id: str):
    logger.info(f"Initiating chat exemption for chat {chat_id}")
    request = InitiateExemptionInput(**router.current_event.json_body)
    logger.info(f"Initiating chat exemption for chat {chat_id} with exemptionType {request.exemptionType}")
    return {"rootNodeId": "0"}


@router.post("/chat/<chat_id>/traverse-exemption")
@tracer.capture_method(capture_response=False)
def traverse_chat_exemption(chat_id: str):
    logger.info(f"Traversing chat exemption for chat {chat_id}")
    request = TraverseExemptionInput(**router.current_event.json_body)

    # If no answer, just give back the question corresponding to the nodeId.
    if not request.answer:
        qnum = int(request.nodeId)
        if qnum < len(dummy_questions):
            return dummy_questions[qnum].model_dump()
        else:
            return {}

    logger.info("Got answer: " + request.answer)
    qnum = int(request.nodeId)
    if qnum < len(dummy_questions) - 1:
        return dummy_questions[qnum + 1].model_dump()
    else:
        return {}
