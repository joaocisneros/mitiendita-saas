"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { adminApi, type StoreSettings } from "@/lib/admin-api";

const TABS = [
  { id: "marca", label: "Marca", icon: "🏪" },
  { id: "pago", label: "Pago y contacto", icon: "💳" },
  { id: "entrega", label: "Entrega", icon: "🚚" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function ConfigPage() {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [tab, setTab] = useState<TabId>("marca");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.settings().then(setS).catch((e) => setError(e.message));
  }, []);

  function set<K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) {
    setS((prev) => (prev ? { ...prev, [k]: v } : prev));
    setOk(false);
  }

  async function uploadQr(file: File) {
    const { url } = await adminApi.uploadImage(file, "general");
    set("yapeQrUrl", url);
  }
  async function uploadLogo(file: File) {
    const { url } = await adminApi.uploadImage(file, "general");
    set("logoUrl", url);
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    setError("");
    setOk(false);
    try {
      await adminApi.updateSettings({
        storeName: s.storeName,
        businessType: s.businessType ?? undefined,
        description: s.description ?? undefined,
        logoUrl: s.logoUrl ?? undefined,
        primaryColor: s.primaryColor,
        secondaryColor: s.secondaryColor,
        whatsappNumber: s.whatsappNumber ?? undefined,
        yapeQrUrl: s.yapeQrUrl ?? undefined,
        yapeHolderName: s.yapeHolderName ?? undefined,
        yapeNumber: s.yapeNumber ?? undefined,
        allowsPickup: s.allowsPickup,
        allowsDelivery: s.allowsDelivery,
        deliveryFee: Number(s.deliveryFee),
        minOrder: s.minOrder ? Number(s.minOrder) : undefined,
        storeAddress: s.storeAddress ?? undefined,
      });
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (error && !s) return <p className="text-red-600">{error}</p>;
  if (!s) return <p className="text-slate-400">Cargando...</p>;

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <div className="mb-5">
        <p className="text-sm font-bold text-violet-700">Ajustes</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Configuración</h1>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Tu tienda: <b className="text-slate-900">{s.subdomain}.mitiendita.com</b>
        </p>
      </div>

      {/* Pestañas */}
      <div className="mb-5 flex gap-1 rounded-2xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl px-2 py-2.5 text-sm font-bold transition ${
              tab === t.id
                ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        {tab === "marca" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre de la tienda" value={s.storeName} onChange={(v) => set("storeName", v)} />
              <Input label="Rubro" value={s.businessType ?? ""} onChange={(v) => set("businessType", v)} />
            </div>
            <Textarea label="Descripción" value={s.description ?? ""} onChange={(v) => set("description", v)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-sm font-bold text-slate-800">Logo</span>
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                    {s.logoUrl ? <Image src={s.logoUrl} alt="logo" fill sizes="64px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-2xl text-slate-300">🏪</div>}
                  </div>
                  <label className="cursor-pointer rounded-lg bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100">
                    Subir logo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
                  </label>
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-bold text-slate-800">Colores</span>
                <div className="flex gap-3">
                  <Color label="Principal" value={s.primaryColor} onChange={(v) => set("primaryColor", v)} />
                  <Color label="Secundario" value={s.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "pago" && (
          <div className="space-y-4">
            <Input label="WhatsApp (con código país)" value={s.whatsappNumber ?? ""} onChange={(v) => set("whatsappNumber", v)} placeholder="Ej: 51987654321" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Titular de Yape" value={s.yapeHolderName ?? ""} onChange={(v) => set("yapeHolderName", v)} />
              <Input label="Número de Yape" value={s.yapeNumber ?? ""} onChange={(v) => set("yapeNumber", v)} />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-bold text-slate-800">QR de Yape</span>
              <div className="flex items-center gap-3">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                  {s.yapeQrUrl ? <Image src={s.yapeQrUrl} alt="QR" fill sizes="96px" className="object-contain" /> : <div className="flex h-full items-center justify-center text-xs font-bold text-slate-300">QR</div>}
                </div>
                <label className="cursor-pointer rounded-lg bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100">
                  Subir QR de Yape
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQr(f); }} />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">Si subes tu QR, el cliente paga escaneándolo directo en su pedido.</p>
            </div>
          </div>
        )}

        {tab === "entrega" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Check label="Permite recojo en tienda" checked={s.allowsPickup} onChange={(v) => set("allowsPickup", v)} />
              <Check label="Permite entrega a domicilio" checked={s.allowsDelivery} onChange={(v) => set("allowsDelivery", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Costo de entrega" type="number" value={String(s.deliveryFee)} onChange={(v) => set("deliveryFee", v)} />
              <Input label="Pedido mínimo" type="number" value={s.minOrder ?? ""} onChange={(v) => set("minOrder", v)} />
            </div>
            <Input label="Dirección del local" value={s.storeAddress ?? ""} onChange={(v) => set("storeAddress", v)} />
          </div>
        )}
      </div>

      {/* Barra de guardado fija (sobre el nav móvil en celular, junto al sidebar en desktop) */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-64">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
          {error && <span className="mr-auto text-sm font-semibold text-red-600">{error}</span>}
          {ok && <span className="mr-auto text-sm font-semibold text-green-700">✅ Cambios guardados.</span>}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-violet-600 px-7 py-2.5 font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600" />
    </label>
  );
}
function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span>
      <textarea value={value} rows={3} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600" />
    </label>
  );
}
function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-300" />
        <span className="text-xs font-medium text-slate-500">{value}</span>
      </div>
    </label>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-violet-600" />
      {label}
    </label>
  );
}
