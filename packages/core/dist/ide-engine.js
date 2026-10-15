import { homedir } from "node:os";
import { join } from "node:path";
import { readdir, stat, readFile } from "node:fs/promises";
import { checkAllBackends, getAdapter, listAdapters } from "../../adapters/dist/index.js";
import { SessionManager } from "./session-manager.js";
const RISKY = [/\brm\s+-rf\b/i, /\bsudo\b/i, /\bgit\s+push\s+--force\b/i];
export function detectRiskyPrompt(prompt) { return RISKY.filter((re) => re.test(prompt)).map((re) => re.source); }
export class IdeEngine {
  constructor(config = {}) {
    this.sessions = new SessionManager(config.dataDir || join(homedir(), ".unified-ai-ide"));
    this.defaultWorkspace = config.defaultWorkspace || process.cwd();
  }
  listModes() { return listAdapters().map((a) => ({ id: a.mode, name: a.name })); }
  async status() { return checkAllBackends(); }
  async listSessions(limit = 50) { return this.sessions.list(limit); }
  async getSession(id) { return this.sessions.load(id); }
  async listWorkspace(relPath = ".") {
    const root = this.defaultWorkspace;
    const target = join(root, relPath);
    if (!target.startsWith(root)) throw new Error("Path outside workspace");
    const entries = await readdir(target, { withFileTypes: true });
    const items = [];
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      items.push({ name: e.name, path: join(relPath === "." ? "" : relPath, e.name).replace(/^\//, ""), type: e.isDirectory() ? "dir" : "file" });
    }
    items.sort((a, b) => (a.type !== b.type ? (a.type === "dir" ? -1 : 1) : a.name.localeCompare(b.name)));
    return { root, path: relPath, items };
  }
  async readWorkspaceFile(relPath) {
    const root = this.defaultWorkspace;
    const target = join(root, relPath);
    if (!target.startsWith(root)) throw new Error("Path outside workspace");
    const st = await stat(target);
    if (st.size > 512000) throw new Error("File too large");
    return { path: relPath, content: await readFile(target, "utf8"), size: st.size };
  }
  async run(mode, prompt, opts = {}) {
    const adapter = getAdapter(mode);
    const risky = detectRiskyPrompt(prompt);
    if (risky.length && !opts.confirmRisk) return { runId: `run_blocked_${Date.now()}`, status: "awaiting_approval", messages: [], requiresConfirmation: true, riskPatterns: risky };
    const availability = await adapter.checkAvailability();
    if (!availability.available) return { runId: `run_unavailable_${Date.now()}`, status: "failed", messages: [{ id: `msg_${Date.now()}`, role: "user", content: prompt, timestamp: new Date().toISOString() }], error: availability.message, backendMeta: { availability } };
    let sessionId = opts.sessionId;
    if (!sessionId) sessionId = (await this.sessions.create(mode, prompt.slice(0, 40))).session.id;
    const result = await adapter.run({ mode, prompt, sessionId, workspacePath: opts.workspacePath || this.defaultWorkspace, model: opts.model, options: opts.options });
    if (result.messages?.length) { try { await this.sessions.appendMessages(sessionId, result.messages); } catch {} }
    return { ...result, backendMeta: { ...result.backendMeta, sessionId, availability } };
  }
}
