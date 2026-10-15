import { spawn } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { delimiter, join } from "node:path";
export async function which(binary) {
  if (binary.includes("/") || binary.includes("\")) {
    try { await access(binary, constants.X_OK); return binary; } catch { return null; }
  }
  for (const dir of (process.env.PATH || "").split(delimiter)) {
    for (const suffix of ["", ".exe", ".cmd"]) {
      const candidate = join(dir, binary + suffix);
      try { await access(candidate, suffix === ".cmd" ? constants.F_OK : constants.X_OK); return candidate; } catch {}
    }
  }
  return null;
}
export function execCommand(command, args, options = {}) {
  const { cwd, env, timeoutMs = 120000, input } = options;
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, shell: false, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, settled = false;
    const timer = timeoutMs > 0 ? setTimeout(() => { timedOut = true; child.kill("SIGTERM"); setTimeout(() => child.kill("SIGKILL"), 3000); }, timeoutMs) : null;
    child.stdout?.on("data", (c) => { stdout += c.toString("utf8"); });
    child.stderr?.on("data", (c) => { stderr += c.toString("utf8"); });
    child.on("error", (err) => { if (settled) return; settled = true; if (timer) clearTimeout(timer); resolve({ code: 1, stdout, stderr: stderr + (err.message || String(err)), timedOut }); });
    child.on("close", (code) => { if (settled) return; settled = true; if (timer) clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });
    if (input != null && child.stdin) { child.stdin.write(input); child.stdin.end(); } else if (child.stdin) child.stdin.end();
  });
}
export async function resolveBinary(candidates) {
  for (const name of candidates) { const path = await which(name); if (path) return { path, name }; }
  return null;
}
