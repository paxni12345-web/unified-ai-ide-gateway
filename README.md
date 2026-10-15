# Unified AI IDE

Web-based multi-mode AI IDE with real GUI.

| Mode | Backend |
|------|---------|
| **Chat** | Shared OpenAI-compatible / offline stub |
| **Work** | OpenClaw CLI |
| **Code** | OpenCode CLI |
| **Agent** | Hermes Agent CLI |

## Run

```bash
UAIDE_WORKSPACE=$PWD node apps/desktop/dist/server.js
# open http://127.0.0.1:3847
```

GUI: mode switcher, file explorer, chat, sessions, execution log.

## License

MIT
