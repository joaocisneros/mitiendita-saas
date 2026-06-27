export type OrderStatusContext = "physical" | "service" | "telecom";

type Meta = { label: string; cls: string };

const PHYSICAL_ORDER_STATUS: Record<string, Meta> = {
  pending: { label: "Pendiente", cls: "bg-gray-100 text-gray-700" },
  confirmed: { label: "Confirmado", cls: "bg-blue-100 text-blue-700" },
  preparing: { label: "Preparando", cls: "bg-indigo-100 text-indigo-700" },
  out_for_delivery: { label: "En camino", cls: "bg-amber-100 text-amber-700" },
  delivered: { label: "Entregado", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
  expired: { label: "Vencido", cls: "bg-red-50 text-red-500" },
};

const SERVICE_ORDER_STATUS: Record<string, Meta> = {
  pending: { label: "Solicitud recibida", cls: "bg-gray-100 text-gray-700" },
  confirmed: { label: "Cita confirmada", cls: "bg-blue-100 text-blue-700" },
  preparing: { label: "En coordinación", cls: "bg-indigo-100 text-indigo-700" },
  out_for_delivery: { label: "En atención", cls: "bg-amber-100 text-amber-700" },
  delivered: { label: "Finalizada", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
  expired: { label: "Vencido", cls: "bg-red-50 text-red-500" },
};

const TELECOM_ORDER_STATUS: Record<string, Meta> = {
  pending: { label: "Solicitud recibida", cls: "bg-gray-100 text-gray-700" },
  confirmed: { label: "Aceptado", cls: "bg-blue-100 text-blue-700" },
  preparing: { label: "En gestión", cls: "bg-indigo-100 text-indigo-700" },
  out_for_delivery: { label: "Activación programada", cls: "bg-amber-100 text-amber-700" },
  delivered: { label: "Servicio activado", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
  expired: { label: "Vencido", cls: "bg-red-50 text-red-500" },
};

const PAYMENT_STATUS: Record<string, Meta> = {
  pending: { label: "Sin pagar", cls: "bg-gray-100 text-gray-700" },
  proof_submitted: { label: "Comprobante enviado", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Pagado", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado", cls: "bg-red-100 text-red-700" },
};

function orderMap(context: OrderStatusContext) {
  if (context === "telecom") return TELECOM_ORDER_STATUS;
  if (context === "service") return SERVICE_ORDER_STATUS;
  return PHYSICAL_ORDER_STATUS;
}

export function orderStatusMeta(
  status: string,
  context: OrderStatusContext = "physical",
): Meta {
  return orderMap(context)[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
}

/** Etiqueta en español de un estado de pedido/solicitud. */
export function orderStatusLabel(
  status: string,
  context: OrderStatusContext = "physical",
): string {
  return orderStatusMeta(status, context).label;
}

export function StatusBadge({
  status,
  type = "order",
  context = "physical",
}: {
  status: string;
  type?: "order" | "payment";
  context?: OrderStatusContext;
}) {
  const s =
    type === "payment"
      ? PAYMENT_STATUS[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" }
      : orderStatusMeta(status, context);

  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
