from __future__ import annotations

import asyncio
import json
from copy import deepcopy
from typing import Any, Callable, TypeVar

from .config import DATA_DIR, OUTPUTS_DIR, STORE_PATH, TOKENS_PATH

T = TypeVar("T")

_empty_store = {
    "chats": [],
    "messages": [],
    "runs": [],
    "operators": [],
}

_lock = asyncio.Lock()
_cache: dict[str, Any] | None = None
_tokens: dict[str, Any] | None = None


def _ensure_dirs() -> None:
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


def _read_json(path, fallback):
    try:
        return json.loads(path.read_text("utf-8"))
    except FileNotFoundError:
        return fallback
    except json.JSONDecodeError:
        return fallback


async def load_store() -> dict[str, Any]:
    global _cache
    async with _lock:
        if _cache is None:
            _ensure_dirs()
            _cache = {**_empty_store, **_read_json(STORE_PATH, {})}
        return _cache


async def save_store(mutator: Callable[[dict[str, Any]], None]) -> dict[str, Any]:
    global _cache
    async with _lock:
        if _cache is None:
            _ensure_dirs()
            _cache = {**_empty_store, **_read_json(STORE_PATH, {})}
        mutator(_cache)
        _ensure_dirs()
        STORE_PATH.write_text(json.dumps(_cache, indent=2), "utf-8")
        return _cache


async def with_store(fn: Callable[[dict[str, Any]], T]) -> T:
    store = await load_store()
    return fn(store)


async def load_tokens() -> dict[str, Any]:
    global _tokens
    async with _lock:
        if _tokens is None:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            _tokens = _read_json(TOKENS_PATH, {})
        return _tokens


async def save_tokens(mutator: Callable[[dict[str, Any]], None]) -> dict[str, Any]:
    global _tokens
    async with _lock:
        if _tokens is None:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            _tokens = _read_json(TOKENS_PATH, {})
        mutator(_tokens)
        TOKENS_PATH.write_text(json.dumps(_tokens, indent=2), "utf-8")
        return _tokens


def clone(value: Any) -> Any:
    return deepcopy(value)
