/**
 * Texto apto para la descripción que muestra Google: sin marcas de formato
 * (**negrita**, _cursiva_, # títulos), sin saltos de línea y de ~160 caracteres,
 * cortado en una palabra completa.
 */
export function metaDescription(text: string | null | undefined, max = 160): string {
  const clean = (text ?? "")
    .replace(/[*_#`~>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}
