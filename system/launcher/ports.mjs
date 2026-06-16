import http from "node:http";
import net from "node:net";

// Ports ANF tries, in order. Prefers 4000; steps to the next free one when another
// program already holds it. Keep contiguous so the office "next port" is predictable.
export const CANDIDATE_PORTS = [4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009];

// GET /api/health and resolve true ONLY if the responder identifies as ANF.
// `get(port, cb)` is injected so tests need no real network; the default reads the body.
export function probeAnf(port, { get = defaultGet } = {}) {
  return new Promise((resolve) => {
    get(port, (err, body) => {
      if (err) return resolve(false);
      try {
        const parsed = JSON.parse(body);
        resolve(Boolean(parsed) && parsed.app === "anf-inventory");
      } catch {
        resolve(false);
      }
    });
  });
}

function defaultGet(port, cb) {
  const req = http.get(
    { host: "localhost", port, path: "/api/health", timeout: 1500 },
    (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => cb(null, data));
    },
  );
  req.on("error", (e) => cb(e));
  req.on("timeout", () => {
    req.destroy();
    cb(new Error("timeout"));
  });
}

// First candidate where an ANF instance answers, else null. `probe` injected for tests.
export async function findRunningAnf(candidates, probe = probeAnf) {
  for (const port of candidates) {
    if (await probe(port)) return port;
  }
  return null;
}

// First candidate nothing is listening on, else null. `isFree` injected for tests.
export async function pickFreePort(candidates, isFree = defaultIsFree) {
  for (const port of candidates) {
    if (await isFree(port)) return port;
  }
  return null;
}

// A port is free only if a client CONNECTING to localhost:port is refused. We connect
// rather than bind: on Windows a bind to a specific interface succeeds even while another
// program holds the wildcard address (the office app on :4000), so a bind-based check
// reported busy ports as free and the server then crashed with EADDRINUSE. A refused
// connection means nothing is reachable there — exactly what the server (`app.listen(PORT)`,
// wildcard) and the browser care about. Mirrors probeAnf's `host: "localhost"`.
function defaultIsFree(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host: "localhost", port, timeout: 1000 });
    sock.once("connect", () => { sock.destroy(); resolve(false); }); // a server is listening
    sock.once("error", () => resolve(true)); // refused/unreachable → free
    sock.once("timeout", () => { sock.destroy(); resolve(false); }); // uncertain → treat as busy
  });
}

// PID of the process LISTENING on `port` in `netstat -ano` text, else null. Pure.
export function pidForPort(port, netstatText) {
  for (const line of netstatText.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    // ["TCP", "127.0.0.1:4000", "0.0.0.0:0", "LISTENING", "1234"]
    if (cols.length >= 5 && cols[0] === "TCP" && cols[3] === "LISTENING") {
      if (cols[1].endsWith(":" + port) && /^\d+$/.test(cols[4])) return cols[4];
    }
  }
  return null;
}
