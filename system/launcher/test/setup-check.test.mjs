import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { needsInstall, needsBuild, computeInstallHash, computeBuildHash, readState, writeState } from "../setup-check.mjs";

// Temp dirs created by the helpers below; removed in afterEach.
const temps = [];

function mkSystem() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anf-launch-"));
  temps.push(dir);
  fs.writeFileSync(path.join(dir, "package.json"), "{}");
  fs.writeFileSync(path.join(dir, "package-lock.json"), '{"v":1}');
  return dir;
}

afterEach(() => {
  for (const dir of temps.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("setup-check: install", () => {
  it("needs install when node_modules is missing", () => {
    const dir = mkSystem();
    expect(needsInstall(dir)).toBe(true);
  });

  it("does not need install when node_modules exists and the stored hash matches", () => {
    const dir = mkSystem();
    fs.mkdirSync(path.join(dir, "node_modules"));
    writeState(dir, { installHash: computeInstallHash(dir) });
    expect(needsInstall(dir)).toBe(false);
  });

  it("needs install again when package-lock changes", () => {
    const dir = mkSystem();
    fs.mkdirSync(path.join(dir, "node_modules"));
    writeState(dir, { installHash: computeInstallHash(dir) });
    fs.writeFileSync(path.join(dir, "package-lock.json"), '{"v":2}');
    expect(needsInstall(dir)).toBe(true);
  });

  it("writeState/readState round-trips and merges keys", () => {
    const dir = mkSystem();
    writeState(dir, { installHash: "a" });
    writeState(dir, { buildHash: "b" });
    expect(readState(dir)).toEqual({ installHash: "a", buildHash: "b" });
  });

  it("readState returns {} for a valid-JSON but non-object state.json", () => {
    const dir = mkSystem();
    fs.mkdirSync(path.join(dir, "node_modules")); // so needsInstall reaches readState().installHash
    fs.mkdirSync(path.join(dir, ".anf-setup"));
    fs.writeFileSync(path.join(dir, ".anf-setup", "state.json"), "null");
    expect(readState(dir)).toEqual({});
    expect(() => needsInstall(dir)).not.toThrow();
  });
});

function mkBuildSystem() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anf-build-"));
  temps.push(dir);
  fs.mkdirSync(path.join(dir, "shared/src"), { recursive: true });
  fs.mkdirSync(path.join(dir, "server/src"), { recursive: true });
  fs.mkdirSync(path.join(dir, "web/src"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), "{}");
  fs.writeFileSync(path.join(dir, "package-lock.json"), "{}");
  fs.writeFileSync(path.join(dir, "web/index.html"), "<html></html>");
  fs.writeFileSync(path.join(dir, "shared/src/index.ts"), "export const a = 1;");
  return dir;
}

function addDist(dir) {
  fs.mkdirSync(path.join(dir, "server/dist"), { recursive: true });
  fs.writeFileSync(path.join(dir, "server/dist/index.js"), "//");
  fs.mkdirSync(path.join(dir, "web/dist"), { recursive: true });
  fs.writeFileSync(path.join(dir, "web/dist/index.html"), "<html></html>");
}

describe("setup-check: build", () => {
  it("needs build when dist output is missing", () => {
    const dir = mkBuildSystem();
    expect(needsBuild(dir)).toBe(true);
  });

  it("does not need build when dist exists and the stored hash matches", () => {
    const dir = mkBuildSystem();
    addDist(dir);
    writeState(dir, { buildHash: computeBuildHash(dir) });
    expect(needsBuild(dir)).toBe(false);
  });

  it("needs build again when a source file changes", () => {
    const dir = mkBuildSystem();
    addDist(dir);
    writeState(dir, { buildHash: computeBuildHash(dir) });
    fs.writeFileSync(path.join(dir, "shared/src/index.ts"), "export const a = 2;");
    expect(needsBuild(dir)).toBe(true);
  });

  it("computeBuildHash is stable for the same tree and changes with content", () => {
    const dir = mkBuildSystem();
    const h1 = computeBuildHash(dir);
    expect(computeBuildHash(dir)).toBe(h1);
    fs.writeFileSync(path.join(dir, "web/src/new.tsx"), "x");
    expect(computeBuildHash(dir)).not.toBe(h1);
  });
});
