from __future__ import annotations

from .catalog import planner_catalog_text
from .ids import nid
from .llm import complete_json, extract_json
from .store import load_tokens


def _system(connected: set[str]) -> str:
    return f"""You are the planner for prompt2flow, an agent that turns a natural-language task into a runnable workgraph.

Return ONLY JSON with this shape:
{{
  "title": "short chat title",
  "name": "operator / workflow name",
  "assistant_message": "plain text plan for the user. Number the steps. End by asking if they want to proceed.",
  "quick_replies": ["Yes, go ahead!", "...optional alternatives..."],
  "inputs": [
    {{ "id": "snake_case", "label": "Human label", "type": "text|number|checkbox", "required": true, "description": "optional" }}
  ],
  "nodes": [
    {{
      "id": "snake_case",
      "title": "Short title",
      "description": "One sentence shown on the graph node",
      "service": "catalog slug",
      "action": "catalog action",
      "prompt": "Imperative instructions the runtime will follow. Reference user_inputs['id'] for inputs."
    }}
  ]
}}

Rules:
- Use only service slugs from the catalog. Prefer connected tools when they fit.
- Use service "llm" for summarising, drafting, classifying, or transforming text.
- Keep 2–5 nodes. Order them in execution order.
- If the task involves listing/searching records, add a number input like max_results (required).
- If the task involves a search/filter, add an optional text input for the query.
- assistant_message should be helpful and concrete, not marketing copy.
- Always include "Yes, go ahead!" as the first quick reply.
- Add one reply that lets the user change a parameter, and one that lets them revise the plan.

Catalog:
{planner_catalog_text(connected)}
"""


async def plan_workflow(messages: list[dict], user_text: str) -> dict:
    tokens = await load_tokens()
    connected = {slug for slug, rec in tokens.items() if rec and rec.get("access_token")}
    history = "\n".join(f"{m.get('role')}: {m.get('content')}" for m in messages[-8:])
    user = f"Conversation so far:\n{history or '(new chat)'}\n\nLatest user request:\n{user_text}"
    raw = await complete_json(_system(connected), user)
    parsed = extract_json(raw)

    nodes = []
    for index, node in enumerate(parsed.get("nodes") or []):
        nodes.append(
            {
                "id": node.get("id") or f"step_{index + 1}",
                "title": node.get("title") or f"Step {index + 1}",
                "description": node.get("description") or "",
                "service": node.get("service") or "llm",
                "action": node.get("action"),
                "prompt": node.get("prompt")
                or node.get("description")
                or node.get("title")
                or "Complete this step.",
            }
        )
    if not nodes:
        raise RuntimeError("Planner returned no steps.")

    inputs = []
    for index, item in enumerate(parsed.get("inputs") or []):
        itype = item.get("type") if item.get("type") in ("number", "checkbox") else "text"
        inputs.append(
            {
                "id": item.get("id") or f"input_{index + 1}",
                "label": item.get("label") or item.get("id") or f"Input {index + 1}",
                "type": itype,
                "required": bool(item.get("required")),
                "description": item.get("description"),
            }
        )

    workflow = {
        "id": nid(16),
        "name": parsed.get("name") or parsed.get("title") or "Untitled workflow",
        "title": parsed.get("title") or parsed.get("name") or "Untitled workflow",
        "inputs": inputs,
        "nodes": nodes,
        "start_at": nodes[0]["id"],
    }
    quick = parsed.get("quick_replies") or ["Yes, go ahead!", "No, let's change something."]
    return {
        "workflow": workflow,
        "assistantMessage": parsed.get("assistant_message") or "I drafted a workflow. Should I run it?",
        "quickReplies": quick,
    }
