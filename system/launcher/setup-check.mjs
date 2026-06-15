import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const STATE_DIR = ".anf-setup";
const STATE_FILE = "state.json";
const INSTALL_FILES = ["package.json", "package-lock.json"];

// SHA-256 over each file's path (relative to systemDir) + contents, in sorted order.
// systemDir-relative paths keep the hash stable across machines/copies.
function hashFiles(systemDir, files) {
  const byRel = new Map(
    files.map((f) => [path.relative(systemDir, f).replace(/\\/g, "/"), f]),
  );
  const h = crypto.createHash("sha256");
  for (const rel of [...byRel.keys()].sort()) {
    h.update(rel + "\0");
    try {
      h.update(fs.readFileSync(byRel.get(rel)));
    } catch {
      h.update("\0missing\0");
    }
    h.update("\0");
  }
  return h.digest("hex");
}

export function computeInstallHash(systemDir) {
  return hashFiles(
    systemDir,
    INSTALL_FILES.map((f) => path.join(systemDir, f)),
  );
}

export function readState(systemDir) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(systemDir, STATE_DIR, STATE_FILE), "utf8"));
    return data !== null && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

export function writeState(systemDir, partial) {
  const dir = path.join(systemDir, STATE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const next = { ...readState(systemDir), ...partial };
  fs.writeFileSync(path.join(dir, STATE_FILE), JSON.stringify(next, null, 2));
}

export function needsInstall(systemDir) {
  if (!fs.existsSync(path.join(systemDir, "node_modules"))) return true;
  return readState(systemDir).installHash !== computeInstallHash(systemDir);
}

const BUILD_DIRS = ["shared/src", "server/src", "web/src"];
const BUILD_FILES = [
  "web/index.html",
  "web/vite.config.ts",
  "web/tailwind.config.ts",
  "web/postcss.config.js",
  "tsconfig.base.json",
  "shared/tsconfig.json",
  "server/tsconfig.json",
  "web/tsconfig.json",
  "shared/package.json",
  "server/package.json",
  "web/package.json",
];

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

export function computeBuildHash(systemDir) {
  const files = [
    ...BUILD_DIRS.flatMap((d) => walkFiles(path.join(systemDir, d))),
    ...BUILD_FILES.map((f) => path.join(systemDir, f)),
  ];
  return hashFiles(systemDir, files);
}

export function needsBuild(systemDir) {
  const serverDist = path.join(systemDir, "server", "dist", "index.js");
  const webDist = path.join(systemDir, "web", "dist", "index.html");
  if (!fs.existsSync(serverDist) || !fs.existsSync(webDist)) return true;
  return readState(systemDir).buildHash !== computeBuildHash(systemDir);
}
