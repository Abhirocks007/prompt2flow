from __future__ import annotations

import secrets
import time
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from .catalog import LIVE_SLUGS, integration_by_slug
from .config import settings
from .store import load_tokens, save_tokens

router = APIRouter()

_pending: dict[str, str] = {}

GOOGLE_SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email"
MICROSOFT_SCOPES = "offline_access User.Read Files.ReadWrite"


def redirect_uri(slug: str) -> str:
    return f"{settings.api_origin}/api/integrations/{slug}/callback"


def _account(record: dict | None) -> str:
    return (record or {}).get("account") or "connected"


async def connected_slugs() -> set[str]:
    tokens = await load_tokens()
    return {slug for slug, rec in tokens.items() if rec and rec.get("access_token")}


async def connected_account(slug: str) -> str | None:
    tokens = await load_tokens()
    rec = tokens.get(slug)
    if rec and rec.get("access_token"):
        return _account(rec)
    return None


@router.get("/api/integrations/{slug}/authorize")
async def authorize(slug: str):
    if slug not in LIVE_SLUGS:
        raise HTTPException(400, f"{slug} does not support OAuth in this build")
    state = secrets.token_urlsafe(24)
    _pending[state] = slug
    if slug == "google_gmail":
        if not settings.google_client_id:
            return RedirectResponse(f"{settings.app_origin}/?connect_error=missing_google_client_id")
        params = {
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri(slug),
            "response_type": "code",
            "scope": GOOGLE_SCOPES,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
        }
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
        return RedirectResponse(url)
    if not settings.microsoft_client_id:
        return RedirectResponse(f"{settings.app_origin}/?connect_error=missing_microsoft_client_id")
    params = {
        "client_id": settings.microsoft_client_id,
        "redirect_uri": redirect_uri(slug),
        "response_type": "code",
        "response_mode": "query",
        "scope": MICROSOFT_SCOPES,
        "prompt": "consent",
        "state": state,
    }
    url = (
        f"https://login.microsoftonline.com/{settings.microsoft_tenant}/oauth2/v2.0/authorize?"
        + urlencode(params)
    )
    return RedirectResponse(url)


@router.get("/api/integrations/{slug}/callback")
async def callback(slug: str, code: str | None = None, state: str | None = None, error: str | None = None):
    if error:
        return RedirectResponse(f"{settings.app_origin}/?connect_error={error}")
    if not code or not state or _pending.get(state) != slug:
        return RedirectResponse(f"{settings.app_origin}/?connect_error=invalid_oauth_state")
    _pending.pop(state, None)
    try:
        if slug == "google_gmail":
            await _google_exchange(code)
        else:
            await _microsoft_exchange(code)
    except Exception:
        return RedirectResponse(f"{settings.app_origin}/?connect_error=token_exchange_failed")
    return RedirectResponse(f"{settings.app_origin}/?connected={slug}")


@router.delete("/api/integrations/{slug}")
async def disconnect(slug: str):
    await save_tokens(lambda tokens: tokens.pop(slug, None))
    return {"ok": True, "slug": slug}


async def _google_exchange(code: str) -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri("google_gmail"),
                "grant_type": "authorization_code",
            },
        )
        token_res.raise_for_status()
        payload = token_res.json()
        info = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {payload['access_token']}"},
        )
        info.raise_for_status()
        email = info.json().get("email") or "gmail"
    await _store_token("google_gmail", payload, email)


async def _microsoft_exchange(code: str) -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        token_res = await client.post(
            f"https://login.microsoftonline.com/{settings.microsoft_tenant}/oauth2/v2.0/token",
            data={
                "code": code,
                "client_id": settings.microsoft_client_id,
                "client_secret": settings.microsoft_client_secret,
                "redirect_uri": redirect_uri("microsoft_onedrive"),
                "grant_type": "authorization_code",
                "scope": MICROSOFT_SCOPES,
            },
        )
        token_res.raise_for_status()
        payload = token_res.json()
        me = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {payload['access_token']}"},
        )
        me.raise_for_status()
        body = me.json()
        email = body.get("userPrincipalName") or body.get("mail") or "onedrive"
    await _store_token("microsoft_onedrive", payload, email)


async def _store_token(slug: str, payload: dict, account: str) -> None:
    expires_at = time.time() + int(payload.get("expires_in") or 3600) - 60

    def mutate(tokens: dict) -> None:
        existing = tokens.get(slug) or {}
        tokens[slug] = {
            "access_token": payload["access_token"],
            "refresh_token": payload.get("refresh_token") or existing.get("refresh_token"),
            "expires_at": expires_at,
            "account": account,
            "token_type": payload.get("token_type", "Bearer"),
        }

    await save_tokens(mutate)


async def get_access_token(slug: str, *, force_refresh: bool = False) -> str:
    tokens = await load_tokens()
    rec = tokens.get(slug)
    name = (integration_by_slug(slug) or {}).get("name") or slug
    if not rec or not rec.get("access_token"):
        raise RuntimeError(f"Connect {name} in Tools")
    fresh = bool(rec.get("expires_at") and rec["expires_at"] > time.time())
    if fresh and not force_refresh:
        return rec["access_token"]
    if not rec.get("refresh_token"):
        raise RuntimeError(f"Connect {name} in Tools")
    if slug == "google_gmail":
        await _google_refresh(rec)
    else:
        await _microsoft_refresh(rec)
    tokens = await load_tokens()
    return tokens[slug]["access_token"]


async def _google_refresh(rec: dict) -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": rec["refresh_token"],
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        payload = response.json()
        payload.setdefault("refresh_token", rec["refresh_token"])
        await _store_token("google_gmail", payload, rec.get("account") or "gmail")


async def _microsoft_refresh(rec: dict) -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"https://login.microsoftonline.com/{settings.microsoft_tenant}/oauth2/v2.0/token",
            data={
                "client_id": settings.microsoft_client_id,
                "client_secret": settings.microsoft_client_secret,
                "refresh_token": rec["refresh_token"],
                "grant_type": "refresh_token",
                "scope": MICROSOFT_SCOPES,
            },
        )
        response.raise_for_status()
        payload = response.json()
        payload.setdefault("refresh_token", rec["refresh_token"])
        await _store_token("microsoft_onedrive", payload, rec.get("account") or "onedrive")
