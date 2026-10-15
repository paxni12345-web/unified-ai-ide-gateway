import { createMessageId, createRunId, nowIso } from "../../shared/dist/index.js";
import { execCommand, resolveBinary } from "./cli-utils.js";
export class OpenClawAdapter {
  mode = "work"; name = "OpenClaw"; binary = null;
  async checkAvailability() {
    const found = await resolveBinary(["openclaw"]);
    if (!found) return { mode: "work", available: false, transport: "cli", message: "openclaw not found. Install: curl -fsSL https://openclaw.ai/install.sh | bash" };
    this.binary = found.path;
    const ver = await execCommand(found.path, ["--version"], { timeoutMs: 15000 });
    const version = (ver.stdout || ver.stderr).trim().split("\n")[0] || "unknown";
    return { mode: "work", available: true, binary: found.path, version, transport: "cli", message: `OpenClaw ready (${version})` };
  }
  async run(request) {
    const runId = createRunId();
    const userMsg = { id: createMessageId(), role: "user", content: request.prompt, timestamp: nowIso() };
    if (!this.binary) { const s = await this.checkAvailability(); if (!s.available) return { runId, status: "failed", messages: [userMsg], error: s.message }; }
    const attempts = [["agent", "--message", request.prompt, "--json"], ["agent", "-m", request.prompt]];
    let lastError = "OpenClaw failed";
    for (const args of attempts) {
      const result = await execCommand(this.binary, args, { cwd: request.workspacePath, timeoutMs: 180000 });
      if (result.code === 0) {
        const output = result.stdout.trim() || result.stderr.trim() || "(empty)";
        return { runId, status: "completed", messages: [userMsg, { id: createMessageId(), role: "assistant", content: output, timestamp: nowIso() }], output, backendMeta: { transport: "cli" } };
      }
      lastError = (result.stderr || result.stdout || "error").slice(0, 2000);
    }
    return { runId, status: "failed", messages: [userMsg], error: lastError };
  }
}
export const openClawAdapter = new OpenClawAdapter();
