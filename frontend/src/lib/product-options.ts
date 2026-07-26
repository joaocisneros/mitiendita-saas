/** Convierte "S, M, L" en ["S","M","L"], limpio y sin vacíos. */
export function parseOptions(csv?: string | null): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
