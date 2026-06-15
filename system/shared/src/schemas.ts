import { z } from "zod";

const MAX_CENTAVOS = 100_000_000; // ₱1,000,000.00 — guards the integer-money invariant
export const MAX_QTY = 1_000_000;

export const newProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  unit_price: z.number().int().nonnegative().max(MAX_CENTAVOS),
  category: z.string().trim().max(60).optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    unit_price: z.number().int().nonnegative().max(MAX_CENTAVOS).optional(),
    category: z.string().trim().max(60).optional(),
  })
  .refine((d) => d.name !== undefined || d.unit_price !== undefined || d.category !== undefined, {
    message: "Provide a name, price, or category to update",
  });

export const orderInputSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().positive().max(MAX_QTY),
      }),
    )
    .min(1, "Add at least one item"),
});

export const receiveStockSchema = z.object({
  lines: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().positive().max(MAX_QTY),
      }),
    )
    .min(1, "Add at least one product"),
});

export type NewProductInput = z.infer<typeof newProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type OrderInput = z.infer<typeof orderInputSchema>;
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
