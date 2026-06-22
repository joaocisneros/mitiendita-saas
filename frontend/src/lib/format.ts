const SYMBOLS: Record<string, string> = {
  PEN: "S/",
  USD: "$",
};

/** Formatea un monto con el símbolo de la moneda. "7.5" PEN -> "S/ 7.50" */
export function formatPrice(amount: string | number, currency = "PEN"): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const symbol = SYMBOLS[currency] ?? currency + " ";
  return `${symbol} ${value.toFixed(2)}`;
}
