from __future__ import annotations

import json
import re

import httpx

from .config import settings


async def _chat(messages: list[dict], temperature: float, json_mode: bool) -> str:
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is missing.")
    payload: dict = {
        "model": settings.groq_model,
        "temperature": temperature,
        "messages": messages,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            f"{settings.groq_base_url}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"].get("content") or ""


async def complete_json(system: str, user: str) -> str:
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    try:
        return await _chat(messages, 0.2, True)
    except httpx.HTTPStatusError:
        messages = [
            {
                "role": "system",
                "content": f"{system}\nRespond with a single JSON object and no extra text.",
            },
            {"role": "user", "content": user},
        ]
        return await _chat(messages, 0.2, False)


async def complete_text(system: str, user: str) -> str:
    return await _chat(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        0.4,
        False,
    )


def extract_json(raw: str) -> dict:
    trimmed = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", trimmed, re.I)
    text = fence.group(1) if fence else trimmed
    return json.loads(text)
