import path from "node:path";
import http from "node:http";
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

const launcherDir = path.dirname(fileURLToPath(import.meta.url));
const systemDir = path.resolve(launcherDir, "..");
const PORT = 4000;

// Open a URL (http or file://) in the user's default browser, non-blocking.
function openInBrowser(target) {
  spawn("cmd", ["/c", "start", "", target], { detached: true, stdio: "ignore" }).unref();
}

function pageUrl(name, query = "") {
  return pathToFileURL(path.join(launcherDir, name)).href + query;
}

function probeHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "localhost", port, path: "/api/health", timeout: 1500 },
      (res) => {
        // Any HTTP response means a server is already on :4000 (ours, or — per the
        // spec — a foreign process we must not duplicate). Treat it as "serving".
        res.resume();
        resolve(true);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
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
  // Already running? Just open the app; don't start a duplicate.
  if (await probeHealth(PORT)) {
    openInBrowser("http://localhost:" + PORT + "/");
    return;
  }

  const doInstall = needsInstall(systemDir);
  const doBuild = needsBuild(systemDir);
  const setup = doInstall || doBuild;
  // First run / after update: show the splash, which polls health and redirects
  // itself to the app when ready (the loading screen becomes the homepage).
  if (setup) openInBrowser(pageUrl("loading.html", "?setup=1"));

  if (doInstall) {
    if (!runStep("Installing components", "npm", ["install"])) fail("install");
    writeState(systemDir, { installHash: computeInstallHash(systemDir) });
  }
  if (doBuild) {
    if (!runStep("Building the app", "npm", ["run", "build"])) fail("build");
    writeState(systemDir, { buildHash: computeBuildHash(systemDir) });
  }

  console.log("\nStarting ANF Inventory at http://localhost:" + PORT + " ...");
  const srv = spawn("node", [path.join(systemDir, "server", "dist", "index.js")], {
    cwd: systemDir,
    stdio: "inherit",
  });
  srv.on("error", (err) => {
    console.error("\nCould not start the server: " + err.message);
    openInBrowser(pageUrl("setup-failed.html"));
    process.exit(1);
  });
  srv.on("exit", (code) => process.exit(code ?? 0));

  // Warm launches show no splash, so the orchestrator opens the app itself once
  // the server answers (bare Node, with no file:// limit). On the setup path the
  // splash polls health and redirects itself, so we don't open a second tab.
  if (!setup) {
    const healthy = await waitForHealthy(() => probeHealth(PORT), { attempts: 60, delayMs: 1000 });
    if (!healthy) {
      console.error("\nThe server is taking longer than expected to respond; opening the app anyway.");
    }
    openInBrowser("http://localhost:" + PORT + "/");
  }
}

main();
