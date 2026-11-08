from __future__ import annotations

import asyncio
import json
import re
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from .catalog import INTEGRATIONS, integration_by_slug
from .config import OUTPUTS_DIR, settings
from .execute import create_run, execute_workflow, success_copy, waiting_audit
from .ids import nid
from .oauth import connected_account, connected_slugs, router as oauth_router
from .planner import plan_workflow
from .store import clone, save_store, with_store

app = FastAPI(title="prompt2flow")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(oauth_router)


class MessageBody(BaseModel):
    message: str = ""
    locale: str | None = None
    inputs: dict | None = None
    kind: str | None = None


class TitleBody(BaseModel):
    title: str | None = None


class OperatorRunBody(BaseModel):
    inputs: dict | None = None


def iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def workflow_runs(store: dict, workflow_id: str) -> list[dict]:
    runs = [run for run in store.get("runs") or [] if run.get("workflowId") == workflow_id]
    return sorted(runs, key=lambda item: item.get("startedAt") or "", reverse=True)


def bind_run(store: dict, run: dict, chat_id: str | None = None) -> None:
    idx = next((i for i, item in enumerate(store["runs"]) if item["id"] == run["id"]), -1)
    if idx >= 0:
        store["runs"][idx] = run
    else:
        store["runs"].append(run)
    if chat_id:
        found = next((c for c in store["chats"] if c["id"] == chat_id), None)
        if found:
            found["latestRunId"] = run["id"]
            found["updatedAt"] = iso()
    workflow_id = run.get("workflowId")
    for operator in store.get("operators") or []:
        if operator.get("id") == workflow_id:
            operator["latestRunId"] = run["id"]


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.get("/api/me")
async def me():
    return {
        "name": "Abhiram A",
        "email": "aallam@prompt2flow.dev",
        "workspace": "Abhiram A (Personal)",
        "plan": "Starter",
    }


@app.get("/api/integrations")
async def integrations():
    return {"integrations": INTEGRATIONS}


@app.get("/api/integrations/me")
async def integrations_me():
    connected = await connected_slugs()
    items = []
    for slug in connected:
        item = integration_by_slug(slug)
        if not item or slug == "llm":
            continue
        account = await connected_account(slug)
        items.append(
            {
                "id": slug,
                "isSelected": True,
                "accountIdentifier": account or "connected",
                "integrationSlug": slug,
                "name": item["name"],
                "actionCount": len(item["actions"]),
                "userActions": item["actions"],
            }
        )
    return {"integrations": items}


@app.get("/api/chats")
async def list_chats():
    chats = await with_store(lambda store: sorted(store["chats"], key=lambda c: c["updatedAt"], reverse=True))
    return {"chats": chats}


@app.post("/api/chats")
async def create_chat():
    chat = {
        "id": nid(16),
        "title": "New chat",
        "createdAt": iso(),
        "updatedAt": iso(),
        "workflow": None,
        "latestRunId": None,
        "savedAsOperator": False,
    }

    def add(store):
        store["chats"].insert(0, chat)

    await save_store(add)
    return chat


@app.get("/api/chats/{chat_id}")
async def get_chat(chat_id: str):
    chat = await with_store(lambda store: next((c for c in store["chats"] if c["id"] == chat_id), None))
    if not chat:
        raise HTTPException(404, "not found")
    return chat


@app.get("/api/chats/{chat_id}/messages")
async def get_messages(chat_id: str):
    def read(store):
        chat = next((c for c in store["chats"] if c["id"] == chat_id), None)
        messages = [m for m in store["messages"] if m["chatId"] == chat_id]
        run = None
        if chat and chat.get("latestRunId"):
            run = next((r for r in store["runs"] if r["id"] == chat["latestRunId"]), None)
        return {"chat": chat, "messages": messages, "latestRun": run}

    payload = await with_store(read)
    if not payload["chat"]:
        raise HTTPException(404, "not found")
    return payload


@app.patch("/api/chats/{chat_id}/title")
async def patch_title(chat_id: str, body: TitleBody):
    chat = await with_store(lambda store: next((c for c in store["chats"] if c["id"] == chat_id), None))
    if not chat:
        raise HTTPException(404, "not found")
    if body.title:

        def mutate(store):
            found = next((c for c in store["chats"] if c["id"] == chat_id), None)
            if found:
                found["title"] = body.title
                found["updatedAt"] = iso()

        await save_store(mutate)
    return {"title": body.title or chat["title"]}


@app.post("/api/chats/{chat_id}/messages")
async def post_message(chat_id: str, body: MessageBody):
    text = (body.message or "").strip()
    if not text:
        raise HTTPException(400, "message required")

    def snapshot(store):
        chat = next((c for c in store["chats"] if c["id"] == chat_id), None)
        messages = [m for m in store["messages"] if m["chatId"] == chat_id]
        run = None
        if chat and chat.get("latestRunId"):
            run = next((r for r in store["runs"] if r["id"] == chat["latestRunId"]), None)
        return {"chat": clone(chat) if chat else None, "messages": clone(messages), "run": clone(run)}

    snap = await with_store(snapshot)
    if not snap["chat"]:
        raise HTTPException(404, "not found")

    user_message = {
        "id": nid(16),
        "chatId": chat_id,
        "role": "user",
        "content": text,
        "createdAt": iso(),
    }

    def add_user(store):
        store["messages"].append(user_message)
        found = next((c for c in store["chats"] if c["id"] == chat_id), None)
        if found:
            found["updatedAt"] = iso()

    await save_store(add_user)
    kind = classify(text, body.kind, snap["run"], bool(body.inputs))

    async def gen():
        queue: asyncio.Queue = asyncio.Queue()

        async def send(event: str, data):
            await queue.put((event, data))

        async def runner():
            try:
                if kind == "confirm_run":
                    await handle_confirm(chat_id, snap["chat"], user_message["id"], send)
                elif kind == "submit_inputs":
                    await handle_inputs(
                        chat_id, snap["chat"], snap["run"], body.inputs or {}, user_message["id"], send
                    )
                elif kind == "save_operator":
                    await handle_save(chat_id, snap["chat"], text, user_message["id"], send)
                elif kind == "decline_save":
                    await handle_plain(
                        chat_id,
                        user_message["id"],
                        "Okay — leaving it unsaved. You can still rerun this chat or start another workflow.",
                        ["Create a new workflow", "No, I'm all set"],
                        send,
                    )
                elif kind == "rename_save":
                    await handle_plain(
                        chat_id, user_message["id"], "What should we call this operator?", [], send
                    )
                else:
                    await handle_plan(
                        chat_id,
                        snap["messages"] + [user_message],
                        text,
                        user_message["id"],
                        send,
                    )
            except Exception as error:
                await handle_plain(
                    chat_id, user_message["id"], f"Something went wrong: {error}", [], send
                )
            finally:
                await queue.put((None, None))

        task = asyncio.create_task(runner())
        try:
            while True:
                event, data = await queue.get()
                if event is None:
                    break
                yield sse(event, data)
        finally:
            await task

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


def classify(text: str, kind: str | None, run: dict | None, has_inputs: bool) -> str:
    if kind:
        return kind
    lower = text.lower()
    if has_inputs or "here are the workflow inputs" in lower:
        return "submit_inputs"
    if lower.startswith("yes, go ahead") or lower == "yes" or "run it again" in lower:
        return "confirm_run"
    if "yes, save it" in lower:
        return "save_operator"
    if "save it with a different name" in lower:
        return "rename_save"
    if "no, don't save" in lower or "no, i'm all set" in lower:
        return "decline_save"
    if run and run.get("status") == "waiting_for_input" and has_inputs:
        return "submit_inputs"
    return "plan"


async def handle_plan(chat_id, messages, text, user_message_id, send):
    await send("notification", {"content": "Planning a workgraph", "id": nid(12), "status": "started"})
    planned = await plan_workflow(messages, text)
    assistant = {
        "id": nid(16),
        "chatId": chat_id,
        "role": "assistant",
        "content": planned["assistantMessage"],
        "createdAt": iso(),
        "quickReplies": planned["quickReplies"],
    }

    def mutate(store):
        chat = next((c for c in store["chats"] if c["id"] == chat_id), None)
        if chat:
            chat["workflow"] = planned["workflow"]
            chat["title"] = planned["workflow"]["title"]
            chat["latestRunId"] = None
            chat["updatedAt"] = iso()
        store["messages"].append(assistant)

    await save_store(mutate)
    await send("workflow", planned["workflow"])
    await send("quick_replies", planned["quickReplies"])
    await send("message-saved", {"messageId": assistant["id"], "userMessageId": user_message_id})
    await send("assistant", assistant)
    await send("chat-title", {"title": planned["workflow"]["title"]})


async def handle_confirm(chat_id, chat, user_message_id, send):
    if not chat.get("workflow"):
        await handle_plain(chat_id, user_message_id, "There is no workflow to run yet. Describe a task first.", [], send)
        return
    await send(
        "notification",
        {"content": "Preparing agent's workgraph for execution", "id": nid(12), "status": "started"},
    )
    await send(
        "notification",
        {"content": "Starting agent's workgraph execution", "id": nid(12), "status": "started"},
    )
    run = create_run(chat_id, chat["workflow"])
    if chat["workflow"].get("inputs"):
        run["status"] = "waiting_for_input"
        run["audit"].append(waiting_audit())
        await send("notification", {"content": "Waiting for your inputs", "id": nid(12), "status": "started"})
        await send(
            "interrupt",
            {
                "content": {
                    "type": "workflow-inputs-interrupt",
                    "message": "Please provide the inputs for the workflow.",
                    "inputs": chat["workflow"]["inputs"],
                    "envs": [],
                }
            },
        )

    def mutate(store):
        store["runs"].append(run)
        found = next((c for c in store["chats"] if c["id"] == chat_id), None)
        if found:
            found["latestRunId"] = run["id"]
            found["updatedAt"] = iso()

    await save_store(mutate)
    assistant = {
        "id": nid(16),
        "chatId": chat_id,
        "role": "assistant",
        "content": "Waiting for input. Open Auto app to fill the required fields."
        if chat["workflow"].get("inputs")
        else "Starting workgraph execution.",
        "createdAt": iso(),
    }

    def add_msg(store):
        store["messages"].append(assistant)

    await save_store(add_msg)
    await send("run", run)
    await send("message-saved", {"messageId": assistant["id"], "userMessageId": user_message_id})
    await send("assistant", assistant)
    if not chat["workflow"].get("inputs"):
        await handle_inputs(chat_id, chat, run, {}, user_message_id, send, True)


async def handle_inputs(chat_id, chat, existing, inputs, user_message_id, send, skip_ack=False):
    if not chat.get("workflow"):
        await handle_plain(chat_id, user_message_id, "No workflow is attached to this chat.", [], send)
        return
    missing = [
        item
        for item in chat["workflow"].get("inputs") or []
        if item.get("required") and (inputs.get(item["id"]) is None or inputs.get(item["id"]) == "")
    ]
    if missing:
        await send(
            "interrupt",
            {
                "content": {
                    "type": "workflow-inputs-interrupt",
                    "message": "Missing required inputs: " + ", ".join(i["label"] for i in missing),
                    "inputs": chat["workflow"]["inputs"],
                    "envs": [],
                }
            },
        )
        return
    run = (
        existing
        if existing and existing.get("status") in ("waiting_for_input", "running")
        else create_run(chat_id, chat["workflow"])
    )

    def persist_run(store):
        bind_run(store, run, chat_id)

    await save_store(persist_run)
    if not skip_ack:
        await send("notification", {"content": "Got your inputs", "id": nid(12), "status": "started"})

    async def on_update(updated, hint):
        copied = deepcopy(updated)

        def write(store):
            bind_run(store, copied, chat_id)

        await save_store(write)
        await send("run", copied)
        if hint:
            await send("notification", {"content": hint, "id": nid(12), "status": "started"})

    finished = await execute_workflow(run, chat["workflow"], inputs, on_update)
    copy = success_copy(chat["workflow"], finished)
    assistant = {
        "id": nid(16),
        "chatId": chat_id,
        "role": "assistant",
        "content": copy["content"],
        "createdAt": iso(),
        "quickReplies": copy["quickReplies"],
        "fileName": copy.get("fileName"),
        "fileUrl": copy.get("fileUrl"),
    }

    def add_msg(store):
        store["messages"].append(assistant)

    await save_store(add_msg)
    await send("quick_replies", copy["quickReplies"])
    await send("message-saved", {"messageId": assistant["id"], "userMessageId": user_message_id})
    await send("assistant", assistant)


async def handle_save(chat_id, chat, text, user_message_id, send):
    if not chat.get("workflow"):
        await handle_plain(chat_id, user_message_id, "Nothing to save yet.", [], send)
        return
    await send("notification", {"content": "Saving operator", "id": nid(12), "status": "started"})
    name = extract_custom_name(text) or chat["workflow"]["name"]
    operator = {
        "id": chat["workflow"]["id"],
        "name": name,
        "status": "Ready",
        "workflow": {**chat["workflow"], "name": name, "title": name},
        "chatId": chat_id,
        "latestRunId": chat.get("latestRunId"),
        "createdAt": iso(),
    }

    def mutate(store):
        idx = next((i for i, item in enumerate(store["operators"]) if item["id"] == operator["id"]), -1)
        if idx >= 0:
            store["operators"][idx] = operator
        else:
            store["operators"].insert(0, operator)
        found = next((c for c in store["chats"] if c["id"] == chat_id), None)
        if found:
            found["savedAsOperator"] = True
            found["title"] = name
            found["updatedAt"] = iso()
            if found.get("workflow"):
                found["workflow"]["name"] = name
                found["workflow"]["title"] = name

    await save_store(mutate)
    assistant = {
        "id": nid(16),
        "chatId": chat_id,
        "role": "assistant",
        "content": f'The workflow has been saved as "{name}." You can now access and run it whenever you need a fresh pass.',
        "createdAt": iso(),
        "quickReplies": ["Run it again", "Create a new workflow", "No, I'm all set"],
    }

    def add_msg(store):
        store["messages"].append(assistant)

    await save_store(add_msg)
    await send("operator-saved", operator)
    await send("quick_replies", assistant["quickReplies"])
    await send("message-saved", {"messageId": assistant["id"], "userMessageId": user_message_id})
    await send("assistant", assistant)


def extract_custom_name(text: str) -> str | None:
    match = re.search(r"save it as[:\s]+[\"']?([^\"'\n]+)[\"']?", text, re.I)
    return match.group(1).strip() if match else None


async def handle_plain(chat_id, user_message_id, content, quick_replies, send):
    assistant = {
        "id": nid(16),
        "chatId": chat_id,
        "role": "assistant",
        "content": content,
        "createdAt": iso(),
        "quickReplies": quick_replies or None,
    }

    def add_msg(store):
        store["messages"].append(assistant)

    await save_store(add_msg)
    if quick_replies:
        await send("quick_replies", quick_replies)
    await send("message-saved", {"messageId": assistant["id"], "userMessageId": user_message_id})
    await send("assistant", assistant)


@app.get("/api/operators")
async def list_operators():
    operators = await with_store(
        lambda store: sorted(store["operators"], key=lambda o: o["createdAt"], reverse=True)
    )
    return {"operators": operators}


@app.get("/api/operators/{operator_id}")
async def get_operator(operator_id: str):
    def read(store):
        found = next((o for o in store["operators"] if o["id"] == operator_id), None)
        if not found:
            return None
        run = None
        runs = workflow_runs(store, found["id"])
        latest = None
        if found.get("latestRunId"):
            latest = next((r for r in store["runs"] if r["id"] == found["latestRunId"]), None)
        if not latest and runs:
            latest = runs[0]
        return {**found, "latestRun": latest, "runs": runs}

    operator = await with_store(read)
    if not operator:
        raise HTTPException(404, "not found")
    return operator


@app.post("/api/operators/{operator_id}/runs")
async def run_operator(operator_id: str, body: OperatorRunBody):
    operator = await with_store(lambda store: next((o for o in store["operators"] if o["id"] == operator_id), None))
    if not operator:
        raise HTTPException(404, "not found")
    workflow = operator.get("workflow")
    if not workflow:
        raise HTTPException(400, "operator has no workflow")
    inputs = body.inputs or {}
    missing = [
        item
        for item in workflow.get("inputs") or []
        if item.get("required") and (inputs.get(item["id"]) is None or inputs.get(item["id"]) == "")
    ]
    if missing:
        raise HTTPException(400, "Missing required inputs: " + ", ".join(i["label"] for i in missing))

    run = create_run(operator.get("chatId") or operator_id, workflow)

    def persist_run(store):
        bind_run(store, run, operator.get("chatId"))

    await save_store(persist_run)

    async def gen():
        queue: asyncio.Queue = asyncio.Queue()

        async def send(event: str, data):
            await queue.put((event, data))

        async def runner():
            try:
                await send("run", run)

                async def on_update(updated, hint):
                    copied = deepcopy(updated)

                    def write(store):
                        bind_run(store, copied, operator.get("chatId"))

                    await save_store(write)
                    await send("run", copied)
                    if hint:
                        await send("notification", {"content": hint, "id": nid(12), "status": "started"})

                finished = await execute_workflow(run, workflow, inputs, on_update)
                await send("run", finished)
            except Exception as error:
                await send("notification", {"content": f"Something went wrong: {error}", "id": nid(12), "status": "failed"})
            finally:
                await queue.put((None, None))

        task = asyncio.create_task(runner())
        try:
            while True:
                event, data = await queue.get()
                if event is None:
                    break
                yield sse(event, data)
        finally:
            await task

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/api/workflow-runs/{run_id}")
async def get_run(run_id: str):
    run = await with_store(lambda store: next((r for r in store["runs"] if r["id"] == run_id), None))
    if not run:
        raise HTTPException(404, "not found")
    return {"workflowRun": run}


@app.get("/api/objects/download")
async def download(objectKey: str = ""):
    name = Path(objectKey).name
    if not name or ".." in name or objectKey.replace("outputs/", "") != name:
        raise HTTPException(400, "invalid object")
    path = OUTPUTS_DIR / name
    if not path.exists():
        raise HTTPException(404, "not found")
    return FileResponse(path, media_type="text/plain; charset=utf-8", filename=name)
