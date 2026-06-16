import express, { type ErrorRequestHandler } from "express";
import fs from "node:fs";
import path from "node:path";
import { ZodError } from "zod";
import type { DB } from "./db";
import { HttpError } from "./errors";
import { productsRouter } from "./routes/products";
import { stockReceiptsRouter } from "./routes/stockReceipts";
import { ordersRouter } from "./routes/orders";
import { historyRouter } from "./routes/history";
import { filesRouter } from "./routes/files";

export function createApp(db: DB, dataDir: string) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ ok: true, app: "anf-inventory" }));
  app.use("/api/products", productsRouter(db));
  app.use("/api/stock-receipts", stockReceiptsRouter(db, dataDir));
  app.use("/api/orders", ordersRouter(db, dataDir));
  app.use("/api/history", historyRouter(db));
  app.use("/api", filesRouter(db, dataDir));

  // Serve the built web UI if present (production).
  const webDist = path.resolve(__dirname, "../../web/dist");
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")));
  }

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if ((err as { code?: string }).code === "LIMIT_FILE_SIZE") {
      return res.status(422).json({ error: "Receipt is too large (max 10 MB)." });
    }
    if ((err as { type?: string }).type === "entity.parse.failed") {
      return res.status(400).json({ error: "Request body is not valid JSON." });
    }
    if (err instanceof ZodError) {
      return res
        .status(422)
        .json({ error: err.issues[0]?.message ?? "Invalid input", issues: err.issues });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, ...(err.payload ?? {}) });
    }
    console.error(err);
    return res.status(500).json({ error: "Something went wrong." });
  };
  app.use(errorHandler);

  return app;
}
