import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';

type VariantRow = {
  size: string | null;
  color: string | null;
  stock: number;
  reserved: number;
};
type Action = 'reserve' | 'commit' | 'release' | 'restore';

const clean = (value?: string | null) =>
  (value ?? '').trim().toLocaleLowerCase();

export function variantLabel(size?: string | null, color?: string | null) {
  return (
    [size ? `Talla ${size.trim()}` : '', color?.trim() ?? '']
      .filter(Boolean)
      .join(' · ') || null
  );
}

export function parseVariantLabel(label?: string | null) {
  const parts = (label ?? '')
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  const sizePart = parts.find((part) =>
    part.toLocaleLowerCase().startsWith('talla '),
  );
  return {
    size: sizePart?.slice(6).trim() || null,
    color: parts.find((part) => part !== sizePart) || null,
  };
}

export async function adjustVariantStock(
  tx: Prisma.TransactionClient,
  productId: string,
  label: string | null,
  quantity: number,
  action: Action,
) {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { name: true, variantStocks: true },
  });
  const rows = Array.isArray(product?.variantStocks)
    ? (product.variantStocks as VariantRow[])
    : [];
  if (!rows.length) return;
  const selected = parseVariantLabel(label);
  const index = rows.findIndex(
    (row) =>
      clean(row.size) === clean(selected.size) &&
      clean(row.color) === clean(selected.color),
  );
  if (index < 0)
    throw new ConflictException(
      `Elige una talla y color válidos para "${product?.name ?? 'el producto'}".`,
    );
  const row = {
    ...rows[index],
    stock: Number(rows[index].stock),
    reserved: Number(rows[index].reserved ?? 0),
  };
  if (action === 'reserve') {
    if (row.stock - row.reserved < quantity)
      throw new ConflictException(
        `Ya no hay suficientes unidades de esa talla o color para "${product?.name}".`,
      );
    row.reserved += quantity;
  } else if (action === 'commit') {
    row.stock = Math.max(0, row.stock - quantity);
    row.reserved = Math.max(0, row.reserved - quantity);
  } else if (action === 'release') {
    row.reserved = Math.max(0, row.reserved - quantity);
  } else {
    row.stock += quantity;
  }
  rows[index] = row;
  await tx.product.update({
    where: { id: productId },
    data: { variantStocks: rows },
  });
}
