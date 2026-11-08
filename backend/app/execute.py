from __future__ import annotations

import asyncio
import json
import re
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from .config import OUTPUTS_DIR
from .ids import nid
from .integrations.gmail import list_emails
from .integrations.onedrive import upload_file
from .llm import complete_text

OnUpdate = Callable[[dict, str | None], Awaitable[None]]


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def stamp() -> str:
    d = datetime.now()
    return d.strftime("%Y%m%d_%H%M%S")


def create_run(chat_id: str, workflow: dict) -> dict:
    started = now()
    return {
        "id": nid(16),
        "chatId": chat_id,
        "workflowId": workflow["id"],
        "status": "running",
        "inputs": {},
        "startedAt": started,
        "activities": [
            {
                "id": nid(12),
                "nodeId": node["id"],
                "title": node["title"],
                "description": node.get("description") or "",
                "status": "pending",
            }
            for node in workflow["nodes"]
        ],
        "audit": [
            {
                "id": nid(8),
                "label": "Workflow execution started",
                "status": "completed",
                "at": started,
            }
        ],
    }


def waiting_audit() -> dict:
    return {
        "id": nid(8),
        "label": "Waiting for your inputs",
        "status": "info",
        "at": now(),
    }


def fill_prompt(prompt: str, inputs: dict) -> str:
    def repl(match: re.Match) -> str:
        key = match.group(1) or match.group(2)
        value = inputs.get(key)
        return "" if value is None else str(value)

    return re.sub(
        r"user_inputs(?:\.get\('([^']+)',\s*'[^']*'\)|\['([^']+)'\])",
        repl,
        prompt,
    )


async def _local_copy(name: str, summary: str, inputs: dict) -> dict:
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    body = "\n".join(
        [
            "prompt2flow summary",
            f"Generated: {now()}",
            f"Query: {inputs.get('query') or inputs.get('search_query') or ''}",
            f"Max results: {inputs.get('max_results') or ''}",
            "",
            summary,
        ]
    )
    (OUTPUTS_DIR / name).write_text(body, "utf-8")
    return {"name": name, "objectKey": f"outputs/{name}"}


async def run_node(node: dict, inputs: dict, prior: dict) -> Any:
    prompt = fill_prompt(node.get("prompt") or "", inputs)
    service = node.get("service")
    if service == "google_gmail":
        emails = await list_emails(inputs)
        prior["emails"] = emails
        return {"emails": emails, "prompt": prompt}
    if service == "llm":
        summary = await complete_text(
            "You produce concise operational summaries. Use plain text, short sections, no markdown tables.",
            f"{prompt}\n\nWorkflow inputs:\n{json.dumps(inputs, indent=2)}\n\nPrior step data:\n{json.dumps(prior, indent=2, default=str)}",
        )
        prior["summary"] = summary
        return {"summary": summary, "prompt": prompt}
    if service == "microsoft_onedrive":
        summary = str(prior.get("summary") or "No summary was produced.")
        requested = str(inputs.get("summary_filename") or inputs.get("filename") or "").strip()
        name = requested or f"Email_Summary_{stamp()}.txt"
        remote = await upload_file(name, summary)
        local = await _local_copy(remote.get("name") or name, summary, inputs)
        file_info = {**local, "webUrl": remote.get("webUrl"), "driveId": remote.get("id")}
        prior["file"] = file_info
        return {"file": file_info, "prompt": prompt}
    generic = {
        "ok": True,
        "service": service,
        "action": node.get("action"),
        "note": f"Mocked {node.get('title')} using {service}.",
        "prompt": prompt,
        "inputs": inputs,
        "priorKeys": list(prior.keys()),
    }
    prior[node["id"]] = generic
    return generic


async def execute_workflow(run: dict, workflow: dict, inputs: dict, on_update: OnUpdate) -> dict:
    run["inputs"] = inputs
    run["status"] = "running"
    run["audit"].append(
        {
            "id": nid(8),
            "label": f"Inputs ({len(inputs)})",
            "status": "info",
            "at": now(),
            "detail": json.dumps(inputs),
        }
    )
    await on_update(run, "Got your inputs")
    prior: dict[str, Any] = {}
    for node in workflow["nodes"]:
        activity = next((item for item in run["activities"] if item["nodeId"] == node["id"]), None)
        if not activity:
            continue
        activity["status"] = "configuring"
        activity["startedAt"] = now()
        run["audit"].append(
            {
                "id": nid(8),
                "label": node["title"],
                "status": "configuring",
                "at": activity["startedAt"],
                "detail": node.get("description"),
            }
        )
        await on_update(run, f"Configuring {node['title']}")
        await asyncio.sleep(0.4)
        try:
            activity["outputs"] = await run_node(node, inputs, prior)
            activity["status"] = "completed"
            activity["completedAt"] = now()
            for event in run["audit"]:
                if event.get("label") == node["title"] and event.get("status") == "configuring":
                    event["status"] = "completed"
                    event["at"] = activity["completedAt"]
        except Exception as error:
            activity["status"] = "failed"
            activity["completedAt"] = now()
            activity["outputs"] = {"error": str(error)}
            run["status"] = "failed"
            run["completedAt"] = now()
            run["audit"].append(
                {
                    "id": nid(8),
                    "label": f"{node['title']} failed",
                    "status": "failed",
                    "at": run["completedAt"],
                }
            )
            await on_update(run, None)
            return run
        await on_update(run, None)

    file_info = prior.get("file")
    run["outputFile"] = file_info
    run["status"] = "completed"
    run["completedAt"] = now()
    run["audit"].append(
        {
            "id": nid(8),
            "label": f"Run stopped — {_clock(run['completedAt'])}",
            "status": "info",
            "at": run["completedAt"],
        }
    )
    await on_update(run, None)
    return run


def success_copy(workflow: dict, run: dict) -> dict:
    file_name = (run.get("outputFile") or {}).get("name")
    object_key = (run.get("outputFile") or {}).get("objectKey")
    file_url = (
        f"/api/objects/download?objectKey={object_key}" if file_name and object_key else None
    )
    if run.get("status") == "failed":
        failed = next((a for a in run["activities"] if a.get("status") == "failed"), None)
        err = ((failed or {}).get("outputs") or {}).get("error") or "A step failed."
        return {
            "content": f"The run stopped: {err}",
            "fileName": file_name,
            "fileUrl": file_url,
            "quickReplies": ["Run it again", "No, let's change something."],
        }
    lines = [
        f"Finished running {workflow['name']}. Every step completed.",
        f"You can find the output file here: {file_name}"
        if file_name
        else "The workflow finished without a downloadable file.",
        f'Would you like to save this workflow? We can call it "{workflow["name"]}" or use a name of your choice.',
    ]
    return {
        "content": "\n\n".join(lines),
        "fileName": file_name,
        "fileUrl": file_url,
        "quickReplies": [
            "Yes, save it with that name",
            "Save it with a different name",
            "No, don't save it",
        ],
    }


def _clock(iso: str) -> str:
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).strftime(
            "%b %-d, %Y, %-I:%M:%S %p"
        )
    except ValueError:
        return iso
