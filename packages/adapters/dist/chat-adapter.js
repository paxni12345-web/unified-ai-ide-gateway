import { createMessageId, createRunId, nowIso } from "../../shared/dist/index.js";
function envKey() {
  if (process.env.OPENROUTER_API_KEY) return { key: process.env.OPENROUTER_API_KEY, baseUrl: "https://openrouter.ai/api/v1", model: process.env.UAIDE_CHAT_MODEL || "openrouter/auto" };
  if (process.env.OPENAI_API_KEY) return { key: process.env.OPENAI_API_KEY, baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1", model: process.env.UAIDE_CHAT_MODEL || "gpt-4o-mini" };
  return null;
}
export class ChatAdapter {
  mode = "chat"; name = "Shared Chat";
  async checkAvailability() {
    const cfg = envKey();
    if (cfg) return { mode: "chat", available: true, transport: "http", message: `Provider configured (${cfg.baseUrl})` };
    return { mode: "chat", available: true, transport: "none", message: "No API key — offline stub. Set OPENAI_API_KEY or OPENROUTER_API_KEY." };
  }
  async run(request) {
    const runId = createRunId();
    const userMsg = { id: createMessageId(), role: "user", content: request.prompt, timestamp: nowIso() };
    const cfg = envKey();
    try {
      let output;
      if (cfg) {
        const model = request.model ? `${request.model.provider}/${request.model.model}` : cfg.model;
        const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` }, body: JSON.stringify({ model, messages: [{ role: "user", content: request.prompt }], temperature: 0.4 }) });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0,400)}`);
        const data = await res.json();
        output = data.choices?.[0]?.message?.content ?? "";
      } else {
        output = `[Chat offline stub]\nNo API key. You said: ${request.prompt.slice(0,500)}`;
      }
      return { runId, status: "completed", messages: [userMsg, { id: createMessageId(), role: "assistant", content: output, timestamp: nowIso() }], output, backendMeta: { transport: cfg ? "http" : "offline-stub" } };
    } catch (err) {
      return { runId, status: "failed", messages: [userMsg], error: err instanceof Error ? err.message : String(err) };
    }
  }
}
export const chatAdapter = new ChatAdapter();
