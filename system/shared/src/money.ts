/** Money is stored and computed as integer centavos (1/100 peso). */

export function formatPeso(centavos: number): string {
  const pesos = centavos / 100;
  const body = pesos.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₱${body}`;
}

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

export function computeAmount(unitPriceCentavos: number, qty: number): number {
  return unitPriceCentavos * qty;
}

export function computeTotal(items: { unitPrice: number; qty: number }[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}
