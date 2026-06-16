import { describe, it, expect } from "vitest";
import http from "node:http";
import {
  probeAnf,
  findRunningAnf,
  pickFreePort,
  pidForPort,
  CANDIDATE_PORTS,
} from "../ports.mjs";

// Bind an ephemeral wildcard listener (like the office's other program, and like
// ANF's own `app.listen(PORT)`); returns [port, close()].
function occupyWildcardPort() {
  const srv = http.createServer((_q, s) => s.end("other app"));
  return new Promise((res) =>
    srv.listen(0, () => res([srv.address().port, () => new Promise((r) => srv.close(r))])),
  );
}

describe("probeAnf", () => {
  it("is true only when health identifies as ANF", async () => {
    const get = (_port, cb) => cb(null, JSON.stringify({ ok: true, app: "anf-inventory" }));
    expect(await probeAnf(4000, { get })).toBe(true);
  });
  it("is false for a foreign server with no ANF marker", async () => {
    const get = (_port, cb) => cb(null, JSON.stringify({ ok: true }));
    expect(await probeAnf(4000, { get })).toBe(false);
  });
  it("is false on non-JSON or a connection error", async () => {
    expect(await probeAnf(4000, { get: (_p, cb) => cb(null, "<html>nope") })).toBe(false);
    expect(await probeAnf(4000, { get: (_p, cb) => cb(new Error("ECONNREFUSED")) })).toBe(false);
  });
});

describe("findRunningAnf", () => {
  it("returns the first candidate whose probe matches ANF", async () => {
    const probe = async (port) => port === 4001;
    expect(await findRunningAnf([4000, 4001, 4002], probe)).toBe(4001);
  });
  it("returns null when no candidate is ANF", async () => {
    expect(await findRunningAnf([4000, 4001], async () => false)).toBe(null);
  });
});

describe("pickFreePort", () => {
  it("returns the first free candidate (skips busy 4000)", async () => {
    const isFree = async (port) => port >= 4001;
    expect(await pickFreePort([4000, 4001, 4002], isFree)).toBe(4001);
  });
  it("returns null when every candidate is busy", async () => {
    expect(await pickFreePort([4000, 4001], async () => false)).toBe(null);
  });
});

// Regression: the real default isFree must use the SAME notion of "occupied" the
// server and browser do. On Windows a bind to a specific interface succeeds even when
// another program holds the wildcard address, so a bind-based check reported a busy
// port as free and ANF then crashed with EADDRINUSE. A connect-based check is correct.
describe("pickFreePort with the REAL default isFree", () => {
  it("treats a wildcard-occupied port as busy (not free)", async () => {
    const [busy, close] = await occupyWildcardPort();
    try {
      expect(await pickFreePort([busy])).toBe(null);
    } finally {
      await close();
    }
  });

  it("steps over a busy port to a free one", async () => {
    const [busy, closeBusy] = await occupyWildcardPort();
    const [free, closeFree] = await occupyWildcardPort();
    await closeFree(); // release it so it's genuinely free
    try {
      expect(await pickFreePort([busy, free])).toBe(free);
    } finally {
      await closeBusy();
    }
  });
});

describe("pidForPort", () => {
  const sample = [
    "Active Connections",
    "  Proto  Local Address          Foreign Address        State           PID",
    "  TCP    127.0.0.1:4000         0.0.0.0:0              LISTENING       1234",
    "  TCP    127.0.0.1:4001         0.0.0.0:0              LISTENING       5678",
    "  TCP    127.0.0.1:51000        93.184.216.34:443     ESTABLISHED     9999",
  ].join("\r\n");
  it("extracts the PID LISTENING on the given port", () => {
    expect(pidForPort(4001, sample)).toBe("5678");
  });
  it("returns null when nothing LISTENS on the port", () => {
    expect(pidForPort(4042, sample)).toBe(null);
  });
});

describe("CANDIDATE_PORTS", () => {
  it("is 4000..4009, 4000 first", () => {
    expect(CANDIDATE_PORTS[0]).toBe(4000);
    expect(CANDIDATE_PORTS).toHaveLength(10);
    expect(CANDIDATE_PORTS[9]).toBe(4009);
  });
});
