/**
 * Impuesto que se suma al total de lo que elige el cliente (traslado +
 * adicionales, o entradas de excursión) SOLO cuando paga online (PayPal o
 * tarjeta). En efectivo se paga el subtotal tal cual. El servidor lo aplica
 * igual al cobrar, así que el importe que ve el visitante es el que se carga.
 */
export const TAX_RATE = 0.05;
export const TAX_LABEL_PCT = '5%';

const round2 = (n: number) => Math.round(n * 100) / 100;

export const taxOn = (subtotal: number) => round2(subtotal * TAX_RATE);

export function withTax(subtotal: number) {
  const tax = taxOn(subtotal);
  return { subtotal: round2(subtotal), tax, total: round2(subtotal + tax) };
}

/** US$30 si es entero, US$31.50 si lleva centavos. */
export const fmtUsd = (n: number) => `US$${Number.isInteger(n) ? n : n.toFixed(2)}`;
