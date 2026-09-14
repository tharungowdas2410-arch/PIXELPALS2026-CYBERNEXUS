from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class DataResponse(BaseModel, Generic[T]):
    data: T
    meta: dict | None = None


class PageMeta(BaseModel):
    total: int
    page: int
    page_size: int


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    total: int
    page: int = 1
    page_size: int = 20


class MessageResponse(BaseModel):
    data: dict[str, str] = Field(default_factory=lambda: {"status": "ok"})
