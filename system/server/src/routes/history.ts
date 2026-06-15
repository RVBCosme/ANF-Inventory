import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db";
import { LOG_ACTIONS, HISTORY_RANGE_VALUES } from "@anf/shared";
import { listHistory } from "../services/history";

export function historyRouter(db: DB): Router {
  const router = Router();
  router.get("/", (req, res) => {
    const action = z.enum(LOG_ACTIONS).optional().catch(undefined).parse(req.query.action);
    const range = z.enum(HISTORY_RANGE_VALUES).catch("all").parse(req.query.range);
    const limit = z.coerce.number().int().positive().max(500).catch(100).parse(req.query.limit);
    res.json(listHistory(db, { action, range, limit }));
  });
  return router;
}
