/** Shared helpers */
export function createRunId() { return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
export function createMessageId() { return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
export function nowIso() { return new Date().toISOString(); }
