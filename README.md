# prompt2flow

Chat-to-workgraph planner. Describe a task, review the graph, fill Auto app inputs, then run it. Planning and LLM steps use Groq. Gmail and OneDrive use live Google and Microsoft APIs after OAuth; other catalog tools are mocked.

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

`.env` keys:

- `GROQ_API_KEY`, `GROQ_MODEL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT` (`common`)
- `APP_ORIGIN=http://localhost:5173`
- `API_ORIGIN=http://localhost:8000`

OAuth redirect URIs:

- `http://localhost:8000/api/integrations/google_gmail/callback`
- `http://localhost:8000/api/integrations/microsoft_onedrive/callback`

Google scope: `gmail.readonly`. Microsoft Graph: `Files.ReadWrite`, `User.Read`, `offline_access`.
