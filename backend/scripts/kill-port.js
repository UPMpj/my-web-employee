const { execSync } = require("child_process");

const port = process.argv[2];
if (!port) process.exit(0);

try {
  if (process.platform === "win32") {
    const out = execSync(`netstat -ano`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) continue;
      const [, localAddr, , state, pid] = parts;
      if (localAddr?.endsWith(`:${port}`) && state === "LISTENING" && pid && pid !== "0") {
        pids.add(pid);
      }
    }
    for (const pid of pids) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" }); } catch {}
    }
  } else {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" });
    for (const pid of out.split("\n").filter(Boolean)) {
      try { execSync(`kill -9 ${pid}`); } catch {}
    }
  }
} catch {
  // nothing listening on the port — fine
}
