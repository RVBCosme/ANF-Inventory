import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { DB } from "../db";
import { NotFoundError } from "../errors";
import { safeResolve } from "../lib/files";

export function filesRouter(db: DB, dataDir: string): Router {
  const router = Router();

  router.get("/receipts/:filename", (req, res) => {
    const full = safeResolve(path.join(dataDir, "receipts"), req.params.filename);
    if (!fs.existsSync(full)) throw new NotFoundError("Receipt not found");
    // Belt-and-suspenders: stop the browser MIME-sniffing a receipt into HTML.
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(full);
  });

  router.get("/orders/:id/pdf", (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const row = db.prepare("SELECT pdf_filename FROM orders WHERE id = ?").get(id) as
      | { pdf_filename: string }
      | undefined;
    if (!row || !row.pdf_filename) throw new NotFoundError("Order PDF not found");
    const full = safeResolve(path.join(dataDir, "orders"), row.pdf_filename);
    if (!fs.existsSync(full)) throw new NotFoundError("Order PDF not found");
    res.type("application/pdf").sendFile(full);
  });

  return router;
}
