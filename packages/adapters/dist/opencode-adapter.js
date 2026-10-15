import { createMessageId, createRunId, nowIso } from "../../shared/dist/index.js";
import { execCommand, resolveBinary } from "./cli-utils.js";
export class OpenCodeAdapter {
  mode = "code"; name = "OpenCode"; binary = null;
  async checkAvailability() {
    const found = await resolveBinary(["opencode", "opencode-ai"]);
    if (!found) return { mode: "code", available: false, transport: "cli", message: "opencode not found. Install: curl -fsSL https://opencode.ai/install | bash" };
    this.binary = found.path;
    const ver = await execCommand(found.path, ["--version"], { timeoutMs: 15000 });
    const version = (ver.stdout || ver.stderr).trim().split("\n")[0] || "unknown";
    return { mode: "code", available: true, binary: found.path, version, transport: "cli", message: `OpenCode ready (${version})` };
  }
  async run(request) {
    const runId = createRunId();
    const userMsg = { id: createMessageId(), role: "user", content: request.prompt, timestamp: nowIso() };
    if (!this.binary) { const s = await this.checkAvailability(); if (!s.available) return { runId, status: "failed", messages: [userMsg], error: s.message }; }
    const args = ["run", "--format", "default", request.prompt];
    const result = await execCommand(this.binary, args, { cwd: request.workspacePath, timeoutMs: 300000 });
    if (result.code !== 0) return { runId, status: "failed", messages: [userMsg], error: (result.stderr || result.stdout || "error").slice(0,4000) };
    const output = result.stdout.trim() || result.stderr.trim() || "(empty)";
    return { runId, status: "completed", messages: [userMsg, { id: createMessageId(), role: "assistant", content: output, timestamp: nowIso() }], output, backendMeta: { transport: "cli" } };
  }
}
export const openCodeAdapter = new OpenCodeAdapter();
