from __future__ import annotations

import httpx

from ..oauth import get_access_token

GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"


def _header(payload: dict, name: str) -> str:
    for item in payload.get("payload", {}).get("headers", []):
        if item.get("name", "").lower() == name.lower():
            return item.get("value") or ""
    return ""


async def list_emails(inputs: dict) -> list[dict]:
    query = str(
        inputs.get("query")
        or inputs.get("search_query")
        or inputs.get("email_search_query")
        or ""
    )
    try:
        max_results = int(inputs.get("max_results") or inputs.get("maxResults") or 5)
    except (TypeError, ValueError):
        max_results = 5
    cap = max(1, min(max_results, 10))
    token = await get_access_token("google_gmail")
    headers = {"Authorization": f"Bearer {token}"}
    params: dict = {"maxResults": cap}
    if query:
        params["q"] = query
    async with httpx.AsyncClient(timeout=30.0) as client:
        listed = await client.get(f"{GMAIL_API}/messages", headers=headers, params=params)
        if listed.status_code == 401:
            token = await get_access_token("google_gmail", force_refresh=True)
            headers = {"Authorization": f"Bearer {token}"}
            listed = await client.get(f"{GMAIL_API}/messages", headers=headers, params=params)
        listed.raise_for_status()
        messages = listed.json().get("messages") or []
        results = []
        for item in messages[:cap]:
            detail = await client.get(
                f"{GMAIL_API}/messages/{item['id']}",
                headers=headers,
                params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]},
            )
            detail.raise_for_status()
            body = detail.json()
            results.append(
                {
                    "id": item["id"],
                    "sender": _header(body, "From"),
                    "subject": _header(body, "Subject"),
                    "date": _header(body, "Date"),
                    "snippet": body.get("snippet") or "",
                }
            )
        return results
