export { chatAdapter, ChatAdapter } from "./chat-adapter.js";
export { openCodeAdapter, OpenCodeAdapter } from "./opencode-adapter.js";
export { openClawAdapter, OpenClawAdapter } from "./openclaw-adapter.js";
export { hermesAdapter, HermesAdapter } from "./hermes-adapter.js";
export { execCommand, which, resolveBinary } from "./cli-utils.js";
import { chatAdapter } from "./chat-adapter.js";
import { openCodeAdapter } from "./opencode-adapter.js";
import { openClawAdapter } from "./openclaw-adapter.js";
import { hermesAdapter } from "./hermes-adapter.js";
const registry = { chat: chatAdapter, work: openClawAdapter, code: openCodeAdapter, agent: hermesAdapter };
export function getAdapter(mode) { const a = registry[mode]; if (!a) throw new Error(`Unknown mode: ${mode}`); return a; }
export function listAdapters() { return Object.values(registry); }
export async function checkAllBackends() { const results = []; for (const adapter of listAdapters()) results.push(await adapter.checkAvailability()); return results; }
