import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { CANDIDATE_PORTS, findRunningAnf, pidForPort } from "./ports.mjs";

// Stop ONLY ANF: find the port whose health marker says it's ANF, map that port to a
// PID via `netstat -ano`, and end it. Never kills by a bare port number, so a different
// program on :4000 is always safe. Deps are injected for tests.
export async function stopAnf({
  findAnf = () => findRunningAnf(CANDIDATE_PORTS),
  netstat = defaultNetstat,
  kill = defaultKill,
  log = console.log,
} = {}) {
  const port = await findAnf();
  if (port === null) {
    log("ANF Inventory was not running.");
    return false;
  }
  const pid = pidForPort(port, netstat());
  if (pid === null) {
    log("ANF Inventory was not running.");
    return false;
  }
  kill(pid);
  log("ANF Inventory has been stopped.");
  return true;
}

function defaultNetstat() {
  return spawnSync("netstat", ["-ano"], { encoding: "utf8" }).stdout || "";
}

function defaultKill(pid) {
  spawnSync("taskkill", ["/PID", pid, "/T", "/F"], { stdio: "ignore" });
}

// Run only when invoked directly (`node stop.mjs`), not when imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  stopAnf();
}
