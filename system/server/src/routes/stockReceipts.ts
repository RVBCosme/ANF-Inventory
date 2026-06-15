import { Router } from "express";
import multer from "multer";
import { receiveStockSchema } from "@anf/shared";
import type { DB } from "../db";
import { HttpError } from "../errors";
import { isAllowedReceipt, saveReceiptBuffer } from "../lib/files";
import { receiveStock } from "../services/stock";

export function stockReceiptsRouter(db: DB, dataDir: string): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) =>
      isAllowedReceipt(file.mimetype)
        ? cb(null, true)
        : cb(new HttpError(422, "Receipt must be a JPG, PNG, or PDF file.")),
  });

  router.post("/", upload.single("receipt"), (req, res) => {
    if (!req.file) {
      throw new HttpError(422, "A receipt (JPG, PNG, or PDF, up to 10 MB) is required.");
    }
    let rawLines: unknown;
    try {
      rawLines = JSON.parse(req.body.lines ?? "[]");
    } catch {
      throw new HttpError(422, "Could not read the product list.");
    }
    const { lines } = receiveStockSchema.parse({ lines: rawLines });
    const filename = saveReceiptBuffer(dataDir, req.file.mimetype, req.file.buffer);
    res.status(201).json(receiveStock(db, lines, filename));
  });

  return router;
}
