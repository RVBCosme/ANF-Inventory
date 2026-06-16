import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import {
  needsInstall,
  needsBuild,
  computeInstallHash,
  computeBuildHash,
  writeState,
} from "./setup-check.mjs";
import { waitForHealthy } from "./health.mjs";
import { CANDIDATE_PORTS, probeAnf, findRunningAnf, pickFreePort } from "./ports.mjs";

const launcherDir = path.dirname(fileURLToPath(import.meta.url));
const systemDir = path.resolve(launcherDir, "..");

// Open a URL (http or file://) in the user's default browser, non-blocking.
function openInBrowser(target) {
  spawn("cmd", ["/c", "start", "", target], { detached: true, stdio: "ignore" }).unref();
}

function pageUrl(name, query = "") {
  return pathToFileURL(path.join(launcherDir, name)).href + query;
}

function runStep(label, cmd, args) {
  console.log("\n=== " + label + " ===");
  const r = spawnSync(cmd, args, { cwd: systemDir, stdio: "inherit", shell: true });
  return r.status === 0;
}

function fail(stage) {
  console.error("\nSetup failed during " + stage + ". See the messages above.");
  openInBrowser(pageUrl("setup-failed.html"));
  process.exit(1);
}

async function main() {
  // Already running on any candidate? Open ANF — never start a duplicate, and never
  // open a foreign program that merely happens to hold :4000.
  const running = await findRunningAnf(CANDIDATE_PORTS);
  if (running !== null) {
    openInBrowser("http://localhost:" + running + "/");
    return;
  }

  // Choose ANF's port: prefer 4000, step past whatever holds it.
  const port = await pickFreePort(CANDIDATE_PORTS);
  if (port === null) {
    const first = CANDIDATE_PORTS[0];
    const last = CANDIDATE_PORTS[CANDIDATE_PORTS.length - 1];
    console.error("\nNo free port available in " + first + "-" + last + ".");
    openInBrowser(pageUrl("setup-failed.html"));
    process.exit(1);
  }

  const doInstall = needsInstall(systemDir);
  const doBuild = needsBuild(systemDir);
  const setup = doInstall || doBuild;
  // First run / after update: show the splash, which polls health and redirects itself
  // to the app (on this port) when ready.
  if (setup) openInBrowser(pageUrl("loading.html", "?setup=1&port=" + port));

  if (doInstall) {
    if (!runStep("Installing components", "npm", ["install"])) fail("install");
    writeState(systemDir, { installHash: computeInstallHash(systemDir) });
  }
  if (doBuild) {
    if (!runStep("Building the app", "npm", ["run", "build"])) fail("build");
    writeState(systemDir, { buildHash: computeBuildHash(systemDir) });
  }

  console.log("\nStarting ANF Inventory at http://localhost:" + port + " ...");
  const srv = spawn("node", [path.join(systemDir, "server", "dist", "index.js")], {
    cwd: systemDir,
    stdio: "inherit",
    env: { ...process.env, PORT: String(port) },
  });
  srv.on("error", (err) => {
    console.error("\nCould not start the server: " + err.message);
    openInBrowser(pageUrl("setup-failed.html"));
    process.exit(1);
  });
  srv.on("exit", (code) => process.exit(code ?? 0));

  // Warm launches show no splash, so the orchestrator opens the app once the server
  // answers on this port (bare Node, no file:// limit).
  if (!setup) {
    const healthy = await waitForHealthy(() => probeAnf(port), { attempts: 60, delayMs: 1000 });
    if (!healthy) {
      console.error("\nThe server is taking longer than expected to respond; opening the app anyway.");
    }
    openInBrowser("http://localhost:" + port + "/");
  }
}

main();
