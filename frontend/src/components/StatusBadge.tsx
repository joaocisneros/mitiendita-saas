const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-gray-100 text-gray-700" },
  confirmed: { label: "Confirmado", cls: "bg-blue-100 text-blue-700" },
  preparing: { label: "Preparando", cls: "bg-indigo-100 text-indigo-700" },
  out_for_delivery: { label: "En camino", cls: "bg-amber-100 text-amber-700" },
  delivered: { label: "Entregado", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
  expired: { label: "Vencido", cls: "bg-red-50 text-red-500" },
};

const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Sin pagar", cls: "bg-gray-100 text-gray-700" },
  proof_submitted: { label: "Comprobante enviado", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Pagado", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado", cls: "bg-red-100 text-red-700" },
};

/** Etiqueta en español de un estado de pedido (para historial, etc.). */
export function orderStatusLabel(status: string): string {
  return ORDER_STATUS[status]?.label ?? status;
}

export function StatusBadge({
  status,
  type = "order",
}: {
  status: string;
  type?: "order" | "payment";
}) {
  const map = type === "payment" ? PAYMENT_STATUS : ORDER_STATUS;
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
