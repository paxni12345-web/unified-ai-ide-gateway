import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { nowIso } from "../../shared/dist/index.js";
export class SessionManager {
  constructor(dataDir) { this.dataDir = dataDir; }
  sessionPath(id) { return join(this.dataDir, "sessions", `${id}.json`); }
  async ensureDirs() { await mkdir(join(this.dataDir, "sessions"), { recursive: true }); }
  async create(mode, title) {
    await this.ensureDirs();
    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = nowIso();
    const store = { session: { id, mode, title: title || `${mode} session`, createdAt: now, updatedAt: now }, messages: [] };
    await writeFile(this.sessionPath(id), JSON.stringify(store, null, 2), "utf8");
    return store;
  }
  async load(id) { try { return JSON.parse(await readFile(this.sessionPath(id), "utf8")); } catch { return null; } }
  async list(limit = 50) {
    await this.ensureDirs();
    try {
      const files = await readdir(join(this.dataDir, "sessions"));
      const stores = [];
      for (const f of files) { if (!f.endsWith(".json")) continue; try { stores.push(JSON.parse(await readFile(join(this.dataDir, "sessions", f), "utf8"))); } catch {} }
      stores.sort((a, b) => new Date(b.session.updatedAt) - new Date(a.session.updatedAt));
      return stores.slice(0, limit);
    } catch { return []; }
  }
  async appendMessages(id, messages) {
    const store = await this.load(id);
    if (!store) throw new Error(`Session not found: ${id}`);
    store.messages.push(...messages);
    store.session.updatedAt = nowIso();
    await writeFile(this.sessionPath(id), JSON.stringify(store, null, 2), "utf8");
    return store;
  }
}
