import { MAX_QTY } from "@anf/shared";

export interface ReceiveProduct {
  id: number;
  name: string;
}
export interface ReceiveLine extends ReceiveProduct {
  qty: number;
}

export function addLine(lines: ReceiveLine[], product: ReceiveProduct): ReceiveLine[] {
  if (lines.some((l) => l.id === product.id)) return lines; // already listed — no-op
  return [...lines, { id: product.id, name: product.name, qty: 1 }];
}

export function setQty(lines: ReceiveLine[], id: number, qty: number): ReceiveLine[] {
  const n = Math.max(1, Math.min(Math.floor(qty) || 1, MAX_QTY)); // min 1, no stock ceiling
  return lines.map((l) => (l.id === id ? { ...l, qty: n } : l));
}

export function removeLine(lines: ReceiveLine[], id: number): ReceiveLine[] {
  return lines.filter((l) => l.id !== id);
}
