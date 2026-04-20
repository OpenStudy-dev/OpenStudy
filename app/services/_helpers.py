"""Shared helpers for services."""
from typing import Any, Dict, Iterable
from pydantic import BaseModel


def model_dump_clean(m: BaseModel) -> Dict[str, Any]:
    """Serialize a Pydantic model to JSON-compatible dict (exclude unset + None)."""
    return m.model_dump(mode="json", exclude_none=True, exclude_unset=True)


def only(rows: Iterable[Dict[str, Any]]) -> Dict[str, Any] | None:
    for r in rows:
        return r
    return None
