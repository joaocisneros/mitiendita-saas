"use client";

import { useEffect, useState } from "react";
import { DashboardIcon } from "@/components/DashboardIcon";
import {
  superApi,
  type DniResult,
  type DocumentApiConfig,
  type DocumentApiQuota,
  type RucResult,
} from "@/lib/superadmin-api";

const CONTROL =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100";

export default function RucDniPage() {
  const [config, setConfig] = useState<DocumentApiConfig | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [documentType, setDocumentType] = useState<"dni" | "ruc">("dni");
  const [documentNumber, setDocumentNumber] = useState("");
  const [result, setResult] = useState<DniResult | RucResult | null>(null);
  const [quota, setQuota] = useState<DocumentApiQuota | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState<"save" | "test" | "query" | "">("");

  useEffect(() => {
    superApi
      .documentApiConfig()
      .then((value) => {
        setConfig(value);
        setEnabled(value.enabled || !value.configured);
        if (value.configured && value.enabled)
          superApi
            .documentApiQuota()
            .then((currentQuota) => {
              setQuota(currentQuota);
              setVerified(true);
            })
            .catch(() => {});
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo cargar la configuración.",
        ),
      );
  }, []);

  async function save() {
    if (!verified) {
      setError("Primero debes probar la conexión correctamente.");
      return;
    }
    setBusy("save");
    setError("");
    setMessage("");
    try {
      const updated = await superApi.updateDocumentApiConfig({
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        ...(apiSecret.trim() ? { apiSecret: apiSecret.trim() } : {}),
        enabled,
      });
      setConfig(updated);
      setApiKey("");
      setApiSecret("");
      setMessage("Conexión verificada y guardada correctamente.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar la configuración.",
      );
    } finally {
      setBusy("");
    }
  }

  async function testConnection() {
    const nextApiKey = apiKey.trim();
    const nextApiSecret = apiSecret.trim();
    if (
      (!config?.configured && (!nextApiKey || !nextApiSecret)) ||
      Boolean(nextApiKey) !== Boolean(nextApiSecret)
    ) {
      setVerified(false);
      setError("Ingresa la API Key y el API Secret para probar la conexión.");
      return;
    }
    setBusy("test");
    setError("");
    setMessage("");
    try {
      const response = await superApi.testDocumentApi({
        ...(nextApiKey ? { apiKey: nextApiKey } : {}),
        ...(nextApiSecret ? { apiSecret: nextApiSecret } : {}),
      });
      setQuota(response.quota);
      setVerified(true);
      setMessage("Conexión verificada. Ahora puedes guardar las credenciales.");
    } catch (cause) {
      setVerified(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo conectar con CismaFact.",
      );
    } finally {
      setBusy("");
    }
  }

  async function consult() {
    const digits = documentNumber.replace(/\D/g, "");
    const expected = documentType === "dni" ? 8 : 11;
    if (digits.length !== expected) {
      setError(
        `El ${documentType.toUpperCase()} debe tener ${expected} dígitos.`,
      );
      return;
    }
    setBusy("query");
    setError("");
    setMessage("");
    setResult(null);
    try {
      setResult(
        documentType === "dni"
          ? await superApi.consultDni(digits)
          : await superApi.consultRuc(digits),
      );
      superApi
        .documentApiQuota()
        .then(setQuota)
        .catch(() => {});
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo realizar la consulta.",
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="w-full space-y-6 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-violet-700">Integraciones</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            Consultas RUC y DNI
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
            Valida documentos peruanos mediante la conexión segura con
            CismaFact.
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-bold ${verified ? "bg-emerald-100 text-emerald-800" : config?.configured ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}
        >
          {verified
            ? "Conexión verificada"
            : config?.configured
              ? "Configuración guardada"
              : "Pendiente de configurar"}
        </span>
      </header>

      {(error || message) && (
        <div
          className={`rounded-xl border p-3 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {error || message}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(420px,0.8fr)_minmax(560px,1.4fr)]">
        <div className="contents">
          <section className="order-1 space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <DashboardIcon name="key" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Credenciales de CismaFact
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Se cifran en el servidor y no vuelven a mostrarse.
                </p>
              </div>
            </div>
            <Field label="API Key" help={config?.apiKeyMasked ?? undefined}>
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setVerified(false);
                }}
                className={CONTROL}
                placeholder={
                  config?.configured
                    ? "Dejar vacío para conservar"
                    : "Ingresa la API Key"
                }
              />
            </Field>
            <Field
              label="API Secret"
              help={config?.configured ? "Ya guardado" : undefined}
            >
              <input
                type="password"
                autoComplete="new-password"
                value={apiSecret}
                onChange={(event) => {
                  setApiSecret(event.target.value);
                  setVerified(false);
                }}
                className={CONTROL}
                placeholder={
                  config?.configured
                    ? "Dejar vacío para conservar"
                    : "Ingresa el API Secret"
                }
              />
            </Field>
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              Usa la API Key y el API Secret entregados por CismaFact. No uses
              los tokens de API de MiTiendita.
            </p>
            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3">
              <span>
                <span className="block text-sm font-bold text-slate-800">
                  Integración activa
                </span>
                <span className="block text-xs text-slate-500">
                  Permite realizar consultas desde este módulo.
                </span>
              </span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="h-5 w-5 accent-violet-600"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={testConnection}
                disabled={Boolean(busy)}
                className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {busy === "test" ? "Probando…" : "1. Probar conexión"}
              </button>
              <button
                onClick={save}
                disabled={Boolean(busy) || !verified}
                className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
              >
                {busy === "save" ? "Guardando…" : "2. Guardar conexión"}
              </button>
            </div>
          </section>

          <section className="order-3 space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 xl:col-span-2">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-black text-slate-950">
                Realizar consulta
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Selecciona el documento e ingresa únicamente números.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {(["dni", "ruc"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setDocumentType(type);
                    setDocumentNumber("");
                    setResult(null);
                    setError("");
                  }}
                  className={`rounded-lg px-4 py-2.5 text-sm font-bold ${documentType === type ? "bg-white text-violet-700 shadow-sm" : "text-slate-600"}`}
                >
                  Consultar {type.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                inputMode="numeric"
                value={documentNumber}
                onChange={(event) =>
                  setDocumentNumber(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, documentType === "dni" ? 8 : 11),
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void consult();
                }}
                className={CONTROL}
                placeholder={
                  documentType === "dni"
                    ? "DNI de 8 dígitos"
                    : "RUC de 11 dígitos"
                }
              />
              <button
                onClick={consult}
                disabled={
                  Boolean(busy) || !config?.configured || !config.enabled
                }
                className="shrink-0 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busy === "query" ? "Consultando…" : "Consultar"}
              </button>
            </div>
            {result ? (
              <ResultCard result={result} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-500">
                El resultado aparecerá aquí.
              </div>
            )}
          </section>
        </div>

        {quota?.servicios && (
          <section className="order-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Cuota disponible
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Plan {quota.plan ?? "—"} · Entorno {quota.entorno ?? "—"}
                </p>
              </div>
              {quota.renueva && (
                <span className="text-xs font-semibold text-slate-500">
                  Renueva: {quota.renueva}
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {quota.servicios.map((service) => (
                <div
                  key={service.servicio}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 p-4"
                >
                  <div
                    className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(rgb(124 58 237) ${Math.min(100, service.limite_mensual ? (service.usadas / service.limite_mensual) * 100 : 0)}%, rgb(241 245 249) 0)`,
                    }}
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-center">
                      <span className="text-base font-black text-slate-950">
                        {service.usadas}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900">
                      {service.nombre}
                    </span>
                    <span className="mt-1 block text-lg font-black text-violet-700">
                      {service.restantes} disponibles
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      Consumidas: {service.usadas} · Límite mensual:{" "}
                      {service.limite_mensual}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: DniResult | RucResult }) {
  const rows =
    result.tipo === "dni"
      ? [
          ["Nombre completo", result.nombre],
          ["Nombres", result.nombres],
          ["Apellido paterno", result.apellido_paterno],
          ["Apellido materno", result.apellido_materno],
        ]
      : [
          ["Razón social", result.nombre],
          ["Estado", result.estado],
          ["Condición", result.condicion],
          ["Dirección fiscal", result.direccion],
          ["Ubigeo", result.ubigeo],
          [
            "Ubicación",
            [result.departamento, result.provincia, result.distrito]
              .filter(Boolean)
              .join(" · "),
          ],
        ];
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-black text-emerald-900">Documento encontrado</p>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-emerald-700">
          {result.numero}
        </span>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {value}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between gap-3 text-sm font-bold text-slate-800">
        <span>{label}</span>
        {help && (
          <span className="text-xs font-medium text-slate-500">{help}</span>
        )}
      </span>
      {children}
    </label>
  );
}
