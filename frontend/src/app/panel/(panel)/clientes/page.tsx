"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminCustomer } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { DashboardIcon } from "@/components/DashboardIcon";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load(term = search) {
    setLoading(true);
    setError("");
    adminApi.customers({ search: term.trim() || undefined })
      .then((data) => setCustomers(data.items))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar los clientes."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { adminApi.customers().then((data) => setCustomers(data.items)).catch((reason) => setError(reason instanceof Error ? reason.message : "Error")).finally(() => setLoading(false)); }, []);

  return (
    <div className="space-y-5">
      <div><p className="text-sm font-bold text-violet-700">Relaciones</p><h1 className="mt-1 text-3xl font-black text-slate-950">Clientes</h1><p className="mt-2 text-sm font-medium text-slate-600">Historial de compradores creado automáticamente desde los pedidos.</p></div>
      <div className="flex max-w-xl gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load()} placeholder="Buscar por nombre o teléfono" className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600" /><button onClick={() => load()} className="rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700">Buscar</button></div>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? <p className="p-10 text-center font-semibold text-slate-600">Cargando clientes...</p> : customers.length === 0 ? <div className="p-12 text-center"><DashboardIcon name="customers" className="mx-auto h-10 w-10 text-slate-400" /><p className="mt-3 font-bold text-slate-800">Todavía no hay clientes</p><p className="mt-1 text-sm font-medium text-slate-600">Aparecerán aquí después del primer pedido.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700"><tr><th className="p-4">Cliente</th><th className="p-4">Teléfono</th><th className="p-4">Pedidos</th><th className="p-4">Compras aprobadas</th><th className="p-4">Última compra</th></tr></thead><tbody className="divide-y divide-slate-200">{customers.map((customer) => <tr key={customer.id} className="hover:bg-slate-50"><td className="p-4"><p className="font-bold text-slate-950">{customer.name}</p><p className="max-w-xs truncate text-xs font-medium text-slate-600">{customer.address || "Sin dirección registrada"}</p></td><td className="p-4 font-semibold text-slate-800"><a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-violet-700 hover:underline">{customer.phone}</a></td><td className="p-4 font-bold text-slate-950">{customer.ordersCount}</td><td className="p-4 font-bold text-slate-950">{formatPrice(customer.totalSpent)}</td><td className="p-4 font-medium text-slate-700">{customer.lastPurchaseAt ? new Date(customer.lastPurchaseAt).toLocaleDateString("es-PE") : "—"}</td></tr>)}</tbody></table></div>}
      </div>
      <Link href="/panel/pedidos" className="inline-flex text-sm font-bold text-violet-700 hover:underline">Ver historial de pedidos →</Link>
    </div>
  );
}
