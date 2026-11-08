# auto.supervity.ai — REA evidence

Live study of `https://auto.supervity.ai/u/alpha/agent` in a signed-in Chrome tab (CDP `127.0.0.1:9222`, page target `AD1FC56664526BA2BF291055960628A8`). Tooling: `npx -y rea-agents@6.8.0`. A visitor workflow was planned, connections were confirmed, and “Yes, go ahead!” started execution until required inputs blocked the run.

Each finding is tagged **seen**, **worked out**, or **unknown**.

- **seen** — observed in the live tab (UI, accessibility tree, screenshot, or network body).
- **worked out** — recovered from exported JS / Remix manifest / static analysis, not proven at runtime in this session.
- **unknown** — not observed, capture-limited, or blocked.

Bearer JWTs were captured by REA. They are **not copied here**.

---

## 1. Evidence index

| REA operation | Evidence ID | Notes |
|---|---|---|
| `inspect_web_page` (landing) | `ev_30c3b74a78dbc6c76d940a739fc4ef98ad935ebefbd6f23d7b70a2bd55370245` | a11y, storage keys, workers |
| `capture_web_screenshot` | `ev_7224a70d65f547fd5d9bd8060cd784121bdb0279f2ae524fe7a3e93e5699f0f8` | landing |
| `discover_webmcp_tools` | `ev_941c415d42e96df84cc9b3a6ef98ae2199f483c55bbf36000e623a3474f659f6` | 0 tools |
| `inspect_web_page` + script sources | `ev_84f395522664e29570c2927711f1a4bc3b869793f59ad89717c3ed1b99dddb91` | 225 module scripts |
| `export_web_scripts` | `ev_1ec9712e7d3d7923233001fc6161822bc2a1a0d62dbee060247493972e3c55a3` | origin hash `37d51b2897a5e279…` |
| `analyze_web_bundle` | `ev_3611f4125024b20681c343987843cc7c3866c5de0581f3ce7f37166a49b5d764` | `entry.client-DTgnxfLB.js` timed out |
| `analyze_javascript_application` | `ev_591bb166442bc8f0e3a14edac1e54196051270a8d84986123b55df64616e8729` | 212 files left unselected |
| `inspect_web_event_listeners` `form` | `ev_05cb3b12168e680044a700083b91b54d19f98b16c67a7fdb7205055d5209a322` | `dragover`, `drop` |
| `inspect_web_event_listeners` `textarea` | `ev_08e64573c95422d06a63b887b02e8a18b9e7a6428c5f547c948c6b8413b8fe7f` | `invalid` |
| scenario 1 — create visitor workflow | `ev_dea6943d6b5eb2c24cecaf2814639357334868cf844a497450f4d1870bccd9b6` | 435 events dropped (16MB cap) |
| scenario 2 — reload + catalog | `ev_80cd82025bc4e52335086063b761b0feb507387227f5beb7450045b9a474d1f3` | `/integrations/me` request-step blocked by service worker |
| scenario 3 — `service_workers: block` | failed `target_unavailable` / `service_worker_blocked` | page has a controlling SW |
| scenario 4 — Tools modal + `/me` | `ev_1e02cdbbbecba25a871a273840d0b3677067dbea4ee7f0f6a1d30ecc44779758` | Gmail + OneDrive connected |
| scenario 5 — Close click | `ev_193616fcc84697149f4906df592cdf59881682a94a483c9cae4986cad2f4dd64` | Close missed after reload |
| scenario 6 — Auto app, inspect, Yes | `ev_a6e26b19f8c923f16cf72dff6f5ab50628276de6e3ba9b073b168d27fa7d6502` | execution interrupt |
| inspect during run | `ev_091f9ca0f29a90e99b6c7fbcda56b86de83bc8a6bb909a8d3fd2f3bf9f0dd46e` | configuring steps |
| inspect after completion | `ev_76652fac89564939657aa3536b3399ef40c6297c1ac8b5e553a7aaea52f2789c` | Audit Trail + success copy |
| screenshot success | `ev_40c4b71e3dea58a8c88d2f096431223c4fc33038b08a9dd56c1f78963a8865d6` | file link + save prompt |
| scenario save operator | `ev_8dc59816829c90cc9ae9e7aa4e244d4ab9a615bb9dd7755a27d2d53ade7243a0` | POST save; no reply in 27s |

Browser: Chrome/156.0.8078.79. CDP HTTP discovery used a loopback proxy (`/tmp/cdp_proxy.js` on `127.0.0.1:9223`) because `inspect-web-event-listeners` requires HTTP CDP while Chrome advertised `ws://127.0.0.1:9222/devtools/browser/…`.

Screenshots copied to `auto-evidence-assets/`.

---

## 2. Session and identity

| Finding | Tag | Source |
|---|---|---|
| Landing greeting “Hello Abhiram! Welcome to Auto” | **seen** | inspect a11y `ev_30c3b74…` |
| Header org switcher “Abhiram A (Personal)” | **seen** | scenarios 4/6 screenshots |
| Footer/UI “Logged in: aallam@supervity.ai” | **seen** | a11y trees |
| Plan `Starter` / `type: free` / monthly / `organizationId: cmlteystr000kdl6vv8zesn21` | **seen** | `GET /resources/user-plan` 200, scenario 4 `request-251` |
| `GET /api/v1/organizations/user-organizations` → `[]` | **seen** | scenario 4 `request-249` |
| Keycloak issuer `https://auto.supervity.ai/idp/realms/techforce`, client `azp: bot-maker`, `aud: ["bot-maker","account"]` | **seen** | JWT claims on `GET /api/v1/workflow-token?refresh=1` (token omitted) |
| Token email `allamabhiram003@gmail.com`, name `Abhiram A`, `email_verified: true`, `typ: Bearer`, `scope: openid profile email` | **seen** | same JWT claims; not the token itself |
| Keycloak `sub` UUID `99e0ed3d-778e-4478-b859-4ff00f3a558e` | **seen** | JWT claims |
| Auth helper stores `localStorage.authToken` and refreshes via `GET /api/v1/workflow-token` or `?refresh=1` | **worked out** | `auth.client-DQtLoAPV.js`; `authToken` key **seen** in storage |
| HttpOnly cookies `en_session`, `en_org_team` (values hashed only) | **seen** | scenario 6 end storage |
| Why UI login is `aallam@supervity.ai` while the JWT email is Gmail | **unknown** | possible IdP linked-account vs display email; not proven |
| SSR bootstrap user object (`username`, Prisma-style id) from first landing HTML | **unknown** | not re-extracted into this file; do not treat as confirmed here |

---

## 3. Product surface (planner UI)

![Planned Gmail → OneDrive workgraph](auto-evidence-assets/01-planned-workgraph.png)

**seen** on thread `https://auto.supervity.ai/u/alpha/agent/01a19d1c-87ec-72b6-b5b4-605681a9330c`:

- Title “Gmail to OneDrive Workflow”
- Sidebar: New Chat `/u/alpha/agent`, Operators `/u/alpha/my-agents`, Workbench `/u/human-review`, More, Search chats, avatar “A”
- Composer placeholder “State your task to complete…”
- Composer controls: Add context, Tools, Workflow help, Voice input, Send (disabled until text)
- Right panel tabs: Workgraph (default), Auto app; later Audit Trail appears during a run
- Workgraph nodes: Start → Fetch Gmail Emails → Summarize Emails → Save to OneDrive → End
- Inspect buttons on each node (`Inspect Fetch Gmail Emails`, etc.)
- Zoom In / Zoom Out / Fit View
- Chat log of the visitor prompt plus the assistant plan and quick replies:
  - “Yes, go ahead!”
  - “Can I change the number of emails?”
  - “No, let's change something.”
- Copy / Retry on the assistant message
- Restore-point control appears after the Yes turn

Composer selectors **worked out** from `chat-composer-BXPvEUHs.js`: `textarea[name=message]`, `button.chat-send-btn`.

Form `dragover`/`drop` and textarea `invalid` listeners **seen** via CDP (`performance-C_ZEAySA.js` / Sentry instrumentation wrapping native listeners). Framework-delegated React handlers **unknown** (REA only lists listeners on the matched node).

WebMCP tools: **seen** total `0` (`ev_941c415…`), with completeness `attach_limited`.

---

## 4. Visitor workflow created

Prompt submitted (scenario 1):

> Create a simple workflow that lists my recent emails from Gmail and saves a summary file to OneDrive.

| Field | Value | Tag |
|---|---|---|
| Thread / chat id | `01a19d1c-87ec-72b6-b5b4-605681a9330c` | **seen** |
| Chat title | `Gmail to OneDrive Workflow` | **seen** (`PATCH …/title` later confirmed same string) |
| Workflow name | `Gmail Email Summary to OneDrive` | **seen** (`GET …/messages`) |
| `isTryMode` | `false` | **seen** |
| `latestRun` before Yes | `null` | **seen** |
| `pip_packages` | `["requests"]` | **seen** |
| `business_functions` | Productivity, Email Management | **seen** |
| `start_at` | `fetch_emails` | **seen** |
| Inputs | `query` text optional; `max_results` number **required** | **seen** |

Graph (from `GET /workflow/api/v1/chats/{id}/messages?limit=100`, scenario 4 `request-267`):

1. **fetch_emails** / Fetch Gmail Emails — service `google_gmail`  
   Prompt **seen** (also in step inspector): fetch via `user_inputs.get('query', '')`, cap `user_inputs['max_results']`, extract Sender/Subject/Date/snippet.
2. **summarize_emails** / Summarize Emails — service `llm`  
   Prompt **seen**: `ai_generate` a summary report.
3. **save_to_onedrive** / Save to OneDrive — service `microsoft_onedrive`  
   Prompt **seen**: write `Email_Summary_{timestamp}.txt` with Microsoft Graph `PUT /v1.0/me/drive/root:/<filename>:/content`.

User message id `01a19d1c-899f-75a8-95c5-608c317a0222` at `2026-11-02T16:34:15.583Z`.  
Assistant message id `01a19d1d-36d0-76f5-907c-0cb22fdb1c7f` at `2026-11-02T16:34:59.921Z`.  
Restore point **seen**: checkpoint `01a19d1d-36e7-72d7-a429-281bdf8bb27f`.

Chat list also **seen** 18 threads (older “Retroreflectometer / GRX” chats from Feb 2026). Not investigated.

Whether the planner persisted a separate workflow record under `/api/v1/workflows` (vs chat-scoped workflow JSON): **unknown** (no `GET /workflow/api/v1/workflows` in these captures). Chat payload uses the same ULID for `workflowId`.

---

## 5. Tools / integrations

![Tools modal loading](auto-evidence-assets/02a-tools-loading.png)
![Tools modal with Gmail and OneDrive connected](auto-evidence-assets/02-tools-connected.png)

Clicking Tools **seen**:

1. Dialog “Loading integrations…” with Search + Close (`role=button` name `Close`, not `.ant-modal-close`).
2. Then two columns: **Connected** / **Available to Connect**.

Connected **seen** in UI:

- Microsoft OneDrive — “5/5 Connected”
- Google Gmail — “4/4 Connected”

`GET /integration/api/v1/integrations/me` 200 (scenario 4 `request-299`) **seen**:

```json
{
  "integrations": [
    {
      "id": "01a19cd3-efa4-74bb-a773-1fa4126aa63b",
      "isSelected": true,
      "accountIdentifier": "allamabhiram003@gmail.com",
      "integrationSlug": "google_gmail"
    },
    {
      "id": "019c762f-bbc1-7001-aa39-d29c5de8fb6d",
      "isSelected": true,
      "accountIdentifier": "abhiramallam@outlook.com",
      "integrationSlug": "microsoft_onedrive"
    }
  ]
}
```

Selected-account actions **seen** in the same `/me` body (`userActions`):

- Gmail: `gmail_send_email`, `gmail_list_messages`, `gmail_get_message`, `gmail_modify_labels`
- OneDrive: `onedrive_create_folder`, `onedrive_create_file`, `onedrive_delete`, `onedrive_download`, `onedrive_search`

What “5/5” and “4/4” count (actions vs OAuth scopes vs triggers): **unknown**. Counts match the action lists above plus maybe the trigger; not proven.

Catalog `GET /integration/api/v1/integrations` **seen** 47 slugs, including `google_gmail` v0.0.1 and `microsoft_onedrive` v1.1.0.

Gmail catalog **seen**:

- Actions as above
- Trigger `gmail.message.received` / “New Email Received”
- Scope example `https://www.googleapis.com/auth/gmail.readonly`

OneDrive catalog **seen**:

- Actions as above
- Trigger `onedrive.file.changed` / “File changed”
- Scope example `Files.Read.All`
- Graph-shaped enriched fields (`file_id`, `web_url`, `parent_path`, …)

Available-to-connect list **seen** in the modal (Apollo.io, Notion, Zoom, Typeform, Box, Discord, Webflow, SharePoint, Teams, Outlook, To-Do, Supervity, MailChimp, Twitter/X, Miro, LinkedIn, Zendesk, Salesforce, ServiceNow, Calendly, FreshBooks, Airtable, Monday.com, Shopify, Facebook, Linear, Jira, WordPress, Dropbox, Supabase, GitLab, HubSpot, Google Sheets/Drive/Calendar/Docs, GitHub, Snowflake, Slack, Zoho CRM/Books, Asana, QuickBooks, Instagram, …). Catalog also includes `spotify` which was **not** in the loaded modal a11y snapshot (scroll/virtualization **unknown**).

OAuth connect URL shape **worked out**: `${ENV.INTEGRATION_SVC_PUBLIC_URL}/api/v1/oauth2/${slug}/authorize?…` (`integration-svc-BDrPWnZ9.js`). Not exercised.

Other integration APIs **worked out** (not called here): `PATCH …/accounts/{id}/select`, `DELETE …/accounts/{id}`, `POST …/{slug}/connect-api-key`.

---

## 6. Auto app tab and step inspector

![Auto app input form, disabled before run](auto-evidence-assets/03-auto-app-form.png)

**seen** (scenario 6):

- Tab “Auto app” shows workflow inputs: Email Search Query, Max Results `*`, checkbox “Allow automatic step retries (auto-fix)”
- Those controls are **disabled** before execution (`textbox [disabled]`, Decrease/Increase disabled)
- No Submit button until the run interrupt

![Fetch Gmail Emails step inspector](auto-evidence-assets/04-step-inspector.png)

Inspect Fetch Gmail Emails **seen**:

- Region `Step inspector: Fetch Gmail Emails`
- Back to graph, Previous (disabled), Next step, Copy prompt, Expand
- Tab “Prompt” selected; prompt text matches the workflow JSON `agent_prompt`
- Inspect button reports `[pressed]`

Other inspector tabs (code, I/O, logs) **unknown** — only Prompt was visible.

---

## 7. “Yes, go ahead!” execution

![Yes click → Thinking…](auto-evidence-assets/05-yes-thinking.png)
![Waiting for input / Auto app enabled](auto-evidence-assets/06-waiting-for-input.png)

Clicking the quick reply **seen**:

1. Quick replies disappear; user bubble “Yes, go ahead!”; status “Thinking…”
2. Send button becomes Stop
3. `img/new-icons/system-thinking.gif` loads
4. Network: `POST https://auto.supervity.ai/workflow/api/v1/chats/01a19d1c-87ec-72b6-b5b4-605681a9330c/messages` 200 `text/event-stream`

Request body **seen** (multipart):

- `message=Yes, go ahead!`
- `locale=en`

SSE events **seen** (scenario 6 `request-301`):

```
event: notification
data: {"content":"Preparing agent's workgraph for execution","id":"01a19d29-475c-7047-bddd-6f8416ac2724","status":"started"}

event: notification
data: {"content":"Starting agent's workgraph execution","id":"01a19d29-475c-7047-bddd-6f8416ac2724","status":"started"}

event: notification
data: {"content":"Waiting for your inputs","id":"01a19d29-475c-7049-9f10-9194be2a6bdb","status":"started"}

event: interrupt
data: {"content":{"type":"workflow-inputs-interrupt","message":"Please provide the inputs for the workflow.","inputs":[query, max_results],"envs":[]}}

event: message-saved
data: {"messageId":"01a19d29-4788-71cd-bf7d-65ac9f5a7187","userMessageId":"01a19d29-43be-740e-bd7c-6b341e537e03"}
```

Console **seen**: `Interrupt event received, enabling form...` then `Form enabled - isWaitingForInput set to true` with `mode: execution`, `workflowId: 01a19d1c-…`.

After interrupt **seen**:

- Chat: “Waiting for input” / “Starting agent's workgraph execution”
- Right tabs: Workgraph, Auto app (selected), **Audit Trail**
- Header chip “Waiting for input”
- Auto app inputs **enabled**, Submit visible
- `max_results` still required and empty, so Gmail was **not** fetched in this session

Follow-up `PATCH /workflow/api/v1/chats/{id}/title` **seen** body `{type:"auto", messages:[…]}` → `{"title":"Gmail to OneDrive Workflow"}`.

---

## 7b. Inputs submitted and run completed

The user filled Auto app (`query=job`, `max_results=2`) and submitted before REA clicked Submit. Live UI then showed “Got your inputs” / workgraph evaluation. Do not reload that tab to click Submit; it would drop in-page form state.

![After inputs / evaluation](auto-evidence-assets/07b-after-inputs.png)
![Configuring Save to OneDrive](auto-evidence-assets/07a-run-in-progress.png)
![Success + Audit Trail](auto-evidence-assets/07-run-success.png)

| Field | Value | Tag |
|---|---|---|
| Run id | `01a19d30-4cdd-7ef3-a012-b5455e5d43f7` | **seen** `GET /workflow/api/v1/workflow-runs/{id}` |
| Status | `completed`, `errorDetails: null` | **seen** |
| Window | `2026-11-02T16:55:51.262Z` → `16:57:23.379Z` (~92s) | **seen** |
| Inputs | `query="job"`, `max_results=2` | **seen** run JSON + earlier a11y |
| User resume message | `Here are the workflow inputs` at `16:55:50.690Z` | **seen** messages API |
| All three nodes | Fetch / Summarize / Save **Completed** | **seen** Workgraph + Audit Trail |
| Assistant result | “successfully processed your emails… saved it to your OneDrive” | **seen** |
| File (chat label) | `Email_Summary_20261102_165631.txt` | **seen** |
| Object-store download | `/workflow/api/v1/objects/download?objectKey=supervity-app-production-workflow/{chatId}/{runId}/outputs/Email_Summary_20261102_165718.txt` | **seen** (filename in object key differs by ~47s from the chat label) |
| Cost rollup | `$0.095352`, 35 LLM calls, 238663 tokens (code-generation heavy per step) | **seen** `workflowRun.cost` |
| Step activity ids | fetch `01a19d30-76eb-7470-a169-…`, summarize `01a19d31-0539-7374-98af-…`, save `01a19d31-5ee7-7749-955f-…` | **seen** |
| Audit Trail | “Workflow Execution Started” completed; Inputs (2); “Run stopped” `Nov 2, 2026, 10:27:27 PM` | **seen** (clock equal on every row — display quirk **unknown**) |
| Save generated code | Jupyter-style `code_cell` using `httpx` `PUT https://graph.microsoft.com/v1.0/me/drive/root:/{filename}:/content` and `os.environ["MICROSOFT_ONEDRIVE_TOKEN"]` | **seen** on the run’s `workflowDefinition` (token value not copied) |

Evidence: inspect `ev_091f9ca0…`, `ev_76652fac…`; screenshots `ev_12c4ac8c…`, `ev_40c4b71e…`; save scenario `ev_8dc59816829c90cc9ae9e7aa4e244d4ab9a615bb9dd7755a27d2d53ade7243a0`.

Clicking “Yes, save it with that name” **seen**: `POST …/chats/{id}/messages` multipart `message=Yes, save it with that name` + `locale=en`. First capture ended while still “Thinking…”; the user later completed save (see §7c).

Did Gmail list or OneDrive upload actually run? **seen** after the user submitted inputs (see §7b).

How Submit posts the interrupt resume: **seen** as a user chat message `Here are the workflow inputs` (not a separate execute URL in this capture). Exact Submit multipart body **unknown** (user clicked Submit before REA attached).

---

## 8. Runtime network (actually fetched)

All `auto.supervity.ai` unless noted. Status 200 unless stated.

| Method | URL | Tag |
|---|---|---|
| GET | `/u/alpha/agent` and `/u/alpha/agent/{id}` | **seen** |
| GET | `/api/v1/workflow-token?refresh=1` | **seen** |
| GET | `/api/v1/organizations/user-organizations` | **seen** |
| GET | `/api/v1/organizations/meta` | **seen** |
| GET | `/resources/user-plan?_data=routes/resources+/user-plan` | **seen** |
| GET | `/workflow/api/v1/chats?page=1&limit=20` | **seen** |
| GET | `/workflow/api/v1/chats/{id}/messages?limit=100` | **seen** |
| GET | `/workflow/api/v1/chats/{id}/restore-points` | **seen** |
| POST | `/workflow/api/v1/chats/{id}/messages` SSE | **seen** |
| PATCH | `/workflow/api/v1/chats/{id}/title` | **seen** |
| GET | `/integration/api/v1/integrations` | **seen** |
| GET | `/integration/api/v1/integrations/me` | **seen** |
| GET | `/integration/static/icons/*.svg`, `/img/integrations/llm.svg` | **seen** |
| GET | `/locales/en/{common,marketing,nav,chat,integrations,listings}.json` | **seen** |
| POST | `api2.amplitude.com/2/httpapi` | **seen** |
| GET | `sr-client-cfg.amplitude.com/config/9f9f2d0f1f622283ba32193125e19bfb` | **seen** (one failure in scenario 6) |
| POST | Sentry envelope `o4509241845940224.ingest.us.sentry.io` client `sentry.javascript.remix/10.75.3` | **seen** |
| GET | `js.stripe.com/v3/pricing-table.js` | **seen** |
| GET | `static.cloudflareinsights.com/beacon.min.js` | **seen** |
| POST | `/cdn-cgi/rum` | **seen** |

Planner SSE on the original scenario 1 submit was **unknown** in that capture (event budget dropped 435 events). Path is confirmed later by Yes-click and by static `sendMessage`.

---

## 9. Architecture (client)

| Finding | Tag |
|---|---|
| Remix v2 SPA. Isolated bootstrap: `window.__remixRouteModules = {root, "routes/u+/_layout", "routes/u+/alpha.agent.index"}` plus `import("/assets/entry.client-DTgnxfLB.js")` | **seen** in page script source |
| Vite-hashed `/assets/*.js` modules (~221–225) | **seen** |
| React + Zustand stores (`chat-CZ4E1LpB.js`, `workflow-input-form-B4lSe01q.js`) | **worked out** |
| i18next; namespaces common/marketing/nav/chat/integrations/listings | **seen** fetches + **worked out** `root` hints |
| Ant Design modal for Tools (`antd-BZ2oma6b.js`) | **worked out**; loading copy **seen** |
| PWA caches `supervity-pwa-*`; service worker controls the page | **seen** (storage cache names; scenario 3 SW block) |
| 3 blob workers (Sentry replay / gzip-style) | **seen** |
| Cloudflare in front (speculation, RUM, insights beacon) | **seen** |
| `window.ENV` injected as `window.ENV = ${JSON.stringify(rootLoader.ENV)}` | **worked out** (`root-BGbPqBAz.js`) |
| `ENV.WORKFLOW_SVC_PUBLIC_URL` runtime value `https://auto.supervity.ai/workflow` | **seen** (every workflow fetch) |
| `ENV.INTEGRATION_SVC_PUBLIC_URL` runtime value `https://auto.supervity.ai/integration` | **seen** |
| `ENV.APP_ORIGIN_URL` | **worked out** (used in link handling); origin **seen** |
| `ENV.MODE` used as Sentry `environment` | **worked out**; production implied by live host |
| `ENV.AMPLITUDE_API_KEY` prefix `9f9f2d0f1f622283ba32193125e19bfb` | **seen** in Amplitude URLs |
| `ENV.STRIPE_PUBLISHABLE_KEY` present (pricing-table script loaded) | **seen** load; key value **unknown** (not dumped) |
| `ENV.SENTRY_DSN` / `ALLOW_INDEXING` | **worked out** from client; DSN value not copied here |
| `sendMessage` → `POST ${ENV.WORKFLOW_SVC_PUBLIC_URL}/api/v1/chats/${id}/messages` as SSE (`Accept: text/event-stream`, `Idempotency-Key`) | **worked out** + **seen** at Yes |
| New chat `POST …/api/v1/chats`; title `PATCH …/chats/${id}/title` | **worked out** + title **seen** |
| Remix `isSpaMode` / `v3_singleFetch` stream bootstrap | **worked out** from `entry.client` |

localStorage keys **seen** (values not dumped): `authToken`, `sv_integrations_index`, `sv_integration_names`, `theme`, `preferPersonalWorkspace`, `react-resizable-panels:workgraph-inspector`, Amplitude/Sentry keys.

sessionStorage **seen**: `workflow-chat-tips:auto-show-count`, `sentryReplaySession`, Amplitude session keys.

IndexedDB **seen**: Amplitude session-replay + diagnostics DBs.

---

## 10. Workflow-service API surface (static)

From `workflow-svc-BWN-FC9I.js` under `ENV.WORKFLOW_SVC_PUBLIC_URL` — **worked out**, not all called:

- `/api/v1/workflows` CRUD, export/import, versions, envs, sharing, schedule, upcoming-runs
- `/api/v1/chats`, messages, restore, restore-points, context-files, from-workflow
- `/api/v1/workflow-runs`, cancel, dashboard, llm-calls
- `/api/v1/schedules`
- `/api/v1/event-triggers`
- `/api/v1/workflows/{id}/triggers` (+ pause, rotate-secret, listen, deliveries, test-simulation, preview-mapping)

Remix BFF routes **worked out** from `manifest-6c473b91.js` (177 route ids), including:

- `/api/v1/workflow-runs.execute` and `.stream`, `.retry`, `.skip`
- `/api/v1/workflow-runs.$runId.stream`
- `/api/v1/intent-enrich`, `/api/v1/errors.humanize`, `/api/v1/user/token-stats`
- `/api/v1/workflow-token`, org/team, user-forms
- App routes: `/u/alpha/agent/:id`, `/u/alpha/agent/workflow/:id`, `/u/alpha/my-agents`, `/u/human-review`, `/u/integrations`, `/u/webhooks`, `/u/marketplace`, `/u/schedule`, `/u/billing`, `/u/dashboard`, auth login/logout/signup

SSE event names for trigger test-simulation **worked out**: `activity-run`, `workflow-run`, `thinking`, `trigger-activated`, `error`. Chat-message SSE names **seen** above: `notification`, `interrupt`, `message-saved`. Other chat events (`token`, `workflow`, `quick_replies` parsing, etc.) **unknown**.

---

## 11. Capture limits (unknowns that are methodological)

- Inspect-after-load does not recover the original document’s first-paint network.
- Scenario 1 dropped 435 events at the default 16MB event budget (later scenarios raised total allocation).
- Playwright request-steps cannot run under a controlling service worker; `/integrations/me` needed a real Tools click instead.
- `service_workers: "block"` refuses this origin entirely.
- `analyze_web_bundle` timed out on `entry.client-DTgnxfLB.js`; JS-app analysis left 212 files unselected.
- Network header **values** were not requested (`header_values: false`).
- Storage values are hashed after secret redaction; cookie contents unknown.
- CDP attach can perturb `navigator.platform` / locale (REA limitation text).
- A Chrome extension (`elokhdkahmbgnjfbdddncfpcgjojniop`) injected scripts into the tab; treat extra extension requests as not part of Supervity.

---

## 12. Remaining product unknowns

- Whether “View Operator” vs “Continue in Chat” was used to dismiss the save modal (modal was gone on the next attach).
- How connected-account tokens are stored server-side; refresh; which Google/Microsoft scopes were granted (UI “4/4” / “5/5” only).
- Human-review / Workbench path, scheduling, webhooks.
- Billing beyond Starter/free; Stripe checkout.
- Server-side planner/LLM (model, tools, prompt templates) — only client-visible SSE, workflow JSON, and run cost rollup.

---

## 13. Secrets handling

Do **not** commit or paste:

- `localStorage.authToken` / `GET /api/v1/workflow-token` `token`
- HttpOnly `en_session`
- Any OAuth access tokens (none appeared in `/integrations/me`)

Client-public identifiers that did appear (Amplitude project key, Sentry ingest host, Stripe.js load) are noted above without copying DSNs or publishable keys in full.

---

## 7c. Operator saved (user clicked save)

After the user confirmed save, the assistant **seen**:

> The workflow has been saved as "Gmail Email Summary to OneDrive." You can now access and run it whenever you need to generate a fresh summary of your recent emails.

Follow-up quick replies **seen**: `Run it again` / `Create a new workflow` / `No, I'm all set`. `To-Dos (1)` still present.

A modal **seen** (screenshot, then gone on the next attach):

- Title: “Operator Saved Successfully!”
- “Your operator has been saved under **Operators**”
- Optional “Commit message (v1)”
- Actions: Continue in Chat, View Operator

![Operator saved modal](auto-evidence-assets/10-operator-saved-modal.png)

Operators list `/u/alpha/my-agents?page=1&pageSize=12` **seen**:

- **Ready** — Gmail Email Summary to OneDrive — “1 minute ago” (plus older Road Sign Compliance Lookup)

Opening it **seen** at:

`https://auto.supervity.ai/u/alpha/agent/workflow/01a19d1c-87ec-72b6-b5b4-605681a9330c?tab=Workflow`

Same ULID as the chat. Extra operator tabs **seen**: Workgraph, Auto app, Audit Trail, **Schedule**, **Policy**.

- Schedule: “No schedule configured for this workflow.” `GET /workflow/api/v1/workflows/{id}/upcoming-runs` 200
- Policy: “Policies linked to this workflow's steps…” then loading linked policies
- Auto app: “Checking required integrations” then the same query / max_results / Submit form

Evidence: inspect `ev_c5032c43…`, screenshot modal `ev_840c9dc5…`, operator page `ev_75f1e808…` / `ev_1f8f36e3…`. “Run it again” was **not** clicked.
