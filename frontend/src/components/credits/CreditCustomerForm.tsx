"use client";

import { useState } from "react";
import { adminApi, type CreditCustomer } from "@/lib/admin-api";
import { Overlay } from "@/components/OrderDetailModal";
import { toAddress, toCatalogName, toSentence } from "@/lib/text";

/** "MARIA QUISPE" → "Maria Quispe" (el resto en minúscula). */
const titleCase = (value: string) =>
  value
    .toLocaleLowerCase("es-PE")
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toLocaleUpperCase("es-PE"));

/** Celular peruano sin el 51 inicial, solo dígitos (9). */
const localPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("51") ? digits.slice(2) : digits;
};

type DniState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found" }
  | { status: "exists"; id: string }
  | { status: "error"; message: string };

/** Alta o edición de una clienta de crédito. El DNI autocompleta nombre y apellidos. */
export function CreditCustomerForm({
  customer,
  onClose,
  onSaved,
  onOpenExisting,
}: {
  customer?: CreditCustomer;
  onClose: () => void;
  onSaved: (customer: CreditCustomer) => void;
  onOpenExisting?: (id: string) => void;
}) {
  const [form, setForm] = useState({
    documentNumber: customer?.documentNumber ?? "",
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
    phone: customer ? localPhone(customer.phone) : "",
    address: customer?.address ?? "",
    reference: customer?.reference ?? "",
    note: customer?.note ?? "",
    creditLimit: customer?.creditLimit ?? "",
  });
  const [dni, setDni] = useState<DniState>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  async function lookup(number: string) {
    setDni({ status: "loading" });
    try {
      const data = await adminApi.creditDniLookup(number);
      if (data.existingCustomerId && data.existingCustomerId !== customer?.id) {
        setDni({ status: "exists", id: data.existingCustomerId });
        return;
      }
      setForm((prev) => ({
        ...prev,
        firstName: data.firstName || prev.firstName,
        lastName: data.lastName || prev.lastName,
      }));
      setDni({ status: "found" });
    } catch (reason) {
      setDni({ status: "error", message: reason instanceof Error ? reason.message : "No se pudo consultar el DNI." });
    }
  }

  function changeDni(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    set("documentNumber")(digits);
    setDni({ status: "idle" });
    if (digits.length === 8 && digits !== customer?.documentNumber) void lookup(digits);
  }

  const phoneOk = /^9\d{8}$/.test(form.phone);
  const dniOk = form.documentNumber === "" || form.documentNumber.length === 8;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dniOk) return setError("El DNI debe tener 8 dígitos.");
    if (!phoneOk) return setError("El celular debe tener 9 dígitos y empezar con 9.");
    if (dni.status === "exists") return setError("Esa clienta ya está registrada.");
    setSaving(true);
    setError("");
    const body = {
      // Al crear, sin DNI no se envía; al editar, vacío lo borra.
      documentNumber: form.documentNumber || (customer ? null : undefined),
      firstName: titleCase(form.firstName.trim()),
      lastName: titleCase(form.lastName.trim()),
      phone: form.phone,
      address: toAddress(form.address),
      reference: toCatalogName(form.reference),
      note: toSentence(form.note),
      creditLimit: form.creditLimit.trim() === "" ? null : Number(form.creditLimit),
    };
    try {
      const saved = customer
        ? await adminApi.updateCreditCustomer(customer.id, body)
        : await adminApi.createCreditCustomer(body);
      onSaved(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose} size="wide">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="pr-8 text-xl font-black text-slate-950">{customer ? "Editar clienta" : "Nueva clienta"}</h2>

        <Section title="Datos de la clienta">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Field label="DNI" value={form.documentNumber} onChange={changeDni} placeholder="8 dígitos: completa los nombres" inputMode="numeric" />
              {dni.status === "loading" && <Hint tone="slate">Buscando DNI...</Hint>}
              {dni.status === "found" && <Hint tone="emerald">✓ Datos encontrados.</Hint>}
              {dni.status === "error" && <Hint tone="amber">{dni.message}</Hint>}
              {dni.status === "exists" && (
                <Hint tone="red">
                  Ya está registrada.{" "}
                  {onOpenExisting && (
                    <button type="button" onClick={() => onOpenExisting(dni.id)} className="font-black underline">Ver su ficha</button>
                  )}
                </Hint>
              )}
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-800">Celular <span className="text-red-500">*</span></span>
              <div className={`flex h-10 overflow-hidden rounded-xl border bg-white focus-within:border-violet-600 ${form.phone && !phoneOk ? "border-red-400" : "border-slate-300"}`}>
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">+51</span>
                <input
                  value={form.phone}
                  required
                  inputMode="tel"
                  placeholder="987654321"
                  onChange={(event) => set("phone")(event.target.value.replace(/\D/g, "").slice(0, 9))}
                  className="min-w-0 flex-1 px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>
            <Field label="Nombres" value={form.firstName} onChange={set("firstName")} onBlur={() => set("firstName")(titleCase(form.firstName.trim()))} required />
            <Field label="Apellidos" value={form.lastName} onChange={set("lastName")} onBlur={() => set("lastName")(titleCase(form.lastName.trim()))} required />
          </div>
        </Section>

        <Section title="Dónde se le cobra">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dirección" value={form.address} onChange={set("address")} onBlur={() => set("address")(toAddress(form.address))} placeholder="Ej: Jr. Las Flores 123, El Tambo" required />
            <Field label="Referencia" value={form.reference} onChange={set("reference")} onBlur={() => set("reference")(toCatalogName(form.reference))} placeholder="Ej: frente al mercado, puesto 12" />
          </div>
        </Section>

        <Section title="Condiciones (opcional)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Límite de crédito S/" value={form.creditLimit} onChange={(v) => set("creditLimit")(v.replace(/[^\d.]/g, ""))} placeholder="Sin límite" inputMode="decimal" />
            <Field label="Nota" value={form.note} onChange={set("note")} onBlur={() => set("note")(toSentence(form.note))} placeholder="Ej: cobrar los sábados" />
          </div>
        </Section>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <footer className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button disabled={saving || dni.status === "loading"} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
            {saving ? "Guardando..." : customer ? "Guardar cambios" : "Registrar clienta"}
          </button>
        </footer>
      </form>
    </Overlay>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <legend className="px-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{title}</legend>
      {children}
    </fieldset>
  );
}

function Hint({ tone, children }: { tone: "slate" | "emerald" | "amber" | "red"; children: React.ReactNode }) {
  const tones = { slate: "text-slate-500", emerald: "text-emerald-700", amber: "text-amber-700", red: "text-red-600" };
  return <p className={`mt-1.5 text-xs font-semibold ${tones[tone]}`}>{children}</p>;
}

export function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-800">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        inputMode={inputMode}
        placeholder={placeholder}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600"
      />
    </label>
  );
}
