from __future__ import annotations

from urllib.parse import quote

import httpx

from ..oauth import get_access_token


async def upload_file(name: str, content: str) -> dict:
    token = await get_access_token("microsoft_onedrive")
    safe = quote(name)
    url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{safe}:/content"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "text/plain; charset=utf-8",
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.put(url, headers=headers, content=content.encode("utf-8"))
        if response.status_code == 401:
            token = await get_access_token("microsoft_onedrive", force_refresh=True)
            headers["Authorization"] = f"Bearer {token}"
            response = await client.put(url, headers=headers, content=content.encode("utf-8"))
        response.raise_for_status()
        body = response.json()
        return {
            "name": body.get("name") or name,
            "webUrl": body.get("webUrl"),
            "id": body.get("id"),
        }
