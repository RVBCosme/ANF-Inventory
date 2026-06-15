import { Router } from "express";
import { z } from "zod";
import { newProductSchema, updateProductSchema } from "@anf/shared";
import type { DB } from "../db";
import {
  createProduct,
  listProducts,
  listCategories,
  updateProduct,
  softDeleteProduct,
} from "../services/products";

export function productsRouter(db: DB): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const query = typeof req.query.query === "string" ? req.query.query : undefined;
    res.json(listProducts(db, query));
  });

  router.get("/categories", (_req, res) => {
    res.json(listCategories(db));
  });

  router.post("/", (req, res) => {
    const input = newProductSchema.parse(req.body);
    res.status(201).json(createProduct(db, input));
  });

  router.patch("/:id", (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const input = updateProductSchema.parse(req.body);
    res.json(updateProduct(db, id, input));
  });

  router.delete("/:id", (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    softDeleteProduct(db, id);
    res.status(204).end();
  });

  return router;
}
