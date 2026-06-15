// Pre-dev cleanup: kill any zombie process on port 3000.
// Called by `npm run dev` via the `predev` lifecycle hook.
// Prevents EADDRINUSE errors from stale dev server processes.

import { execSync } from "child_process";
import { setTimeout as sleep } from "timers/promises";

const PORT = 3000;

function findPidOnPort(port) {
  try {
    const stdout = execSync(
      `netstat -ano | findstr "LISTENING" | findstr ":${port} "`,
      { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] },
    );
    for (const line of stdout.trim().split("\n").filter(Boolean)) {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(pid)) return pid;
    }
  } catch { /* no process found */ }
  return null;
}

function killProcess(pid) {
  try {
    execSync(`taskkill /F /PID ${pid}`, { timeout: 5000, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const pid = findPidOnPort(PORT);
if (pid) {
  console.log(`[predev] Killing zombie PID ${pid} on port ${PORT}`);
  if (killProcess(pid)) {
    await sleep(1500);
    if (findPidOnPort(PORT)) {
      console.log(`[predev] Warning: port ${PORT} still in use after kill`);
    } else {
      console.log(`[predev] Port ${PORT} freed`);
    }
  } else {
    console.log(`[predev] Warning: could not kill PID ${pid}`);
  }
} else {
  console.log(`[predev] Port ${PORT} is free`);
}
