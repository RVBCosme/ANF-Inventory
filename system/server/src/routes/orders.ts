import { Router } from "express";
import { orderInputSchema } from "@anf/shared";
import type { DB } from "../db";
import { placeOrder } from "../services/orders";

export function ordersRouter(db: DB, dataDir: string): Router {
  const router = Router();
  router.post("/", async (req, res, next) => {
    try {
      const { items } = orderInputSchema.parse(req.body);
      res.status(201).json(await placeOrder(db, dataDir, items));
    } catch (err) {
      next(err);
    }
  });
  return router;
}
