from typing import Optional, Literal
from pydantic import BaseModel

ModelProvider = Literal["sagemaker", "bedrock"]


class ModelKwargs(BaseModel):
    maxTokens: Optional[int] = None
    temperature: Optional[float] = None
    topP: Optional[float] = None
    stopSequences: list[str] = []


class ModelBase(BaseModel):
    provider: ModelProvider
    modelId: str
    region: Optional[str] = None


class LLMModelBase(ModelBase):
    modelKwargs: Optional[ModelKwargs] = None


class BedRockLLMModel(LLMModelBase):
    provider: ModelProvider = "bedrock"
    supportsSystemPrompt: bool = False


class HandoffConfig(BaseModel):
    modelConfig: BedRockLLMModel
    details: Optional[list[str]] = None
    handoffThreshold: int
