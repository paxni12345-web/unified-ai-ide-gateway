# Unified AI IDE Gateway

API-only Web IDE Gateway for multi-mode AI workspaces.

| Mode | Backend |
|------|---------|
| Chat | Shared OpenAI-compatible / offline stub |
| Work | OpenClaw CLI |
| Code | OpenCode CLI |
| Agent | Hermes Agent CLI |

No bundled CLI UI or web UI.

## Run

```bash
UAIDE_WORKSPACE=$PWD node apps/desktop/dist/server.js
```

API: GET /api/health, /api/status, /api/modes, /api/sessions, /api/workspace, POST /api/run
