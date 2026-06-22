"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { adminApi, type StoreSettings } from "@/lib/admin-api";

export default function ConfigPage() {
  const [s, setS] = useState<StoreSettings | null>(null);
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
  if (!s) return <p className="text-gray-400">Cargando...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold">Configuración de la tienda</h1>
      <p className="text-sm text-gray-500">
        Tu tienda: <b>{s.subdomain}.mitiendita.com</b>
      </p>

      <Section title="Marca">
        <Input label="Nombre de la tienda" value={s.storeName} onChange={(v) => set("storeName", v)} />
        <Input label="Rubro" value={s.businessType ?? ""} onChange={(v) => set("businessType", v)} />
        <Input label="Descripción" value={s.description ?? ""} onChange={(v) => set("description", v)} />
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
            {s.logoUrl ? <Image src={s.logoUrl} alt="logo" fill sizes="64px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300">🏪</div>}
          </div>
          <label className="cursor-pointer rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
            Subir logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
          </label>
        </div>
        <div className="flex gap-4">
          <Color label="Color principal" value={s.primaryColor} onChange={(v) => set("primaryColor", v)} />
          <Color label="Color secundario" value={s.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
        </div>
      </Section>

      <Section title="Contacto y pago">
        <Input label="WhatsApp (con código país)" value={s.whatsappNumber ?? ""} onChange={(v) => set("whatsappNumber", v)} />
        <Input label="Titular de Yape" value={s.yapeHolderName ?? ""} onChange={(v) => set("yapeHolderName", v)} />
        <Input label="Número de Yape" value={s.yapeNumber ?? ""} onChange={(v) => set("yapeNumber", v)} />
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-gray-100">
            {s.yapeQrUrl ? <Image src={s.yapeQrUrl} alt="QR" fill sizes="80px" className="object-contain" /> : <div className="flex h-full items-center justify-center text-xs text-gray-300">QR</div>}
          </div>
          <label className="cursor-pointer rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
            Subir QR de Yape
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQr(f); }} />
          </label>
        </div>
      </Section>

      <Section title="Entrega">
        <div className="flex gap-4">
          <Check label="Permite recojo" checked={s.allowsPickup} onChange={(v) => set("allowsPickup", v)} />
          <Check label="Permite delivery" checked={s.allowsDelivery} onChange={(v) => set("allowsDelivery", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Costo de delivery" type="number" value={String(s.deliveryFee)} onChange={(v) => set("deliveryFee", v)} />
          <Input label="Pedido mínimo" type="number" value={s.minOrder ?? ""} onChange={(v) => set("minOrder", v)} />
        </div>
        <Input label="Dirección del local" value={s.storeAddress ?? ""} onChange={(v) => set("storeAddress", v)} />
      </Section>

      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      {ok && <p className="rounded bg-green-50 p-2 text-sm text-green-700">✅ Guardado.</p>}

      <button onClick={save} disabled={saving}
        className="w-full rounded-full bg-violet-600 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <h2 className="font-bold">{title}</h2>
      {children}
    </div>
  );
}
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-violet-500" />
    </label>
  );
}
function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded border" />
        <span className="text-sm text-gray-500">{value}</span>
      </div>
    </label>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}
