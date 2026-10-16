"use client";

import { useEffect, useState } from "react";
import { superApi, type SaApiTokenRow, type SaCompanyApiTokenRow } from "@/lib/superadmin-api";
import { DashboardIcon } from "@/components/DashboardIcon";
import { CreateApiTokenModal } from "@/components/ApiTokenModal";
import { CreateCompanyApiTokenModal } from "@/components/CompanyApiTokenModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Overlay } from "@/components/OrderDetailModal";

const PLATFORM_SCOPE_LABEL: Record<string, string> = {
  empresas: "Empresas",
  usuarios: "Usuarios",
  planes: "Planes",
  suscripciones: "Suscripciones",
  actividad: "Auditoría",
  whatsapp: "WhatsApp",
  configuracion: "Configuración",
};

const COMPANY_SCOPE_LABEL: Record<string, string> = {
  pedidos: "Pedidos",
  productos: "Productos",
  clientes: "Clientes",
  inventario: "Inventario",
  reportes: "Reportes",
  citas: "Citas",
  suscripciones: "Suscripciones",
  creditos: "Créditos",
};

type TokenRow = SaApiTokenRow | SaCompanyApiTokenRow;
type IconName = Parameters<typeof DashboardIcon>[0]["name"];
type Credentials = { apiKey: string | null; apiSecret: string | null };

/** URL base de la API pública: en el navegador, el mismo dominio la reenvía. */
function useApiBase() {
  const [base, setBase] = useState("");
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api`;
    queueMicrotask(() => setBase(`${api.replace(/\/$/, "")}/v1`));
  }, []);
  return base;
}

const fmtDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Nunca";

/** "hace 3 horas", "hace 2 días"… */
function timeAgo(value: string | null) {
  if (!value) return "nunca";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.round(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

const companyOf = (t: TokenRow) =>
  "companyName" in t && t.companyName ? t.companyName : "Plataforma";

// ───────────────────── Tabla de credenciales ─────────────────────

function TokenTable({
  tokens,
  loading,
  emptyText,
  scopeLabels,
  base,
  onView,
  onEdit,
  onRegenerate,
  onRevoke,
}: {
  tokens: TokenRow[];
  loading: boolean;
  emptyText: string;
  scopeLabels: Record<string, string>;
  base: string;
  onView: (t: TokenRow) => void;
  onEdit: (t: TokenRow) => void;
  onRegenerate: (t: TokenRow) => void;
  onRevoke: (t: TokenRow) => void;
}) {
  // La barra del consumo se compara con la credencial más usada del listado.
  const maxCalls = Math.max(1, ...tokens.map((t) => t.monthlyCalls ?? 0));
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {loading ? (
        <p className="p-10 text-center text-sm font-medium text-slate-500">Cargando...</p>
      ) : tokens.length === 0 ? (
        <p className="p-10 text-center text-sm font-medium text-slate-500">{emptyText}</p>
      ) : (
        <div className="scroll-hidden overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b border-slate-200 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Módulos permitidos</th>
                <th className="px-5 py-3">Consumo del mes</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Creada</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tokens.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <p className="font-black uppercase text-slate-950">{companyOf(t)}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                      {t.name} ·{" "}
                      <span className="font-mono">{t.apiKey ? `${t.apiKey.slice(0, 16)}…` : `${t.tokenPrefix}…`}</span>
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {t.scopes.slice(0, 3).map((s) => (
                        <span key={s} className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                          {scopeLabels[s] ?? s}
                        </span>
                      ))}
                      {t.scopes.length > 3 && (
                        <span
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600"
                          title={t.scopes.slice(3).map((s) => scopeLabels[s] ?? s).join(", ")}
                        >
                          +{t.scopes.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <UsageCell calls={t.monthlyCalls ?? 0} max={maxCalls} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusCell lastUsedAt={t.lastUsedAt} />
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-600">
                    {new Date(t.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1.5">
                      <IconAction icon="eye" tone="text-sky-600 bg-sky-50 ring-sky-200" label="Ver credenciales" onClick={() => onView(t)} />
                      <IconAction icon="pencil" tone="text-slate-600 bg-slate-50 ring-slate-200" label="Editar módulos" onClick={() => onEdit(t)} />
                      <IconAction icon="key" tone="text-violet-600 bg-violet-50 ring-violet-200" label="Generar secret nuevo" onClick={() => onRegenerate(t)} />
                      <IconAction icon="trash" tone="text-red-600 bg-red-50 ring-red-200" label="Eliminar" onClick={() => onRevoke(t)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-xs text-slate-600">
        <span className="font-semibold">Dirección que necesita el programador:</span>
        <code className="rounded-md bg-white px-2 py-0.5 font-mono font-bold text-slate-800 ring-1 ring-slate-200">{base || "…"}</code>
        <span>· En cada petición envía los encabezados <b>X-Api-Key</b> y <b>X-Api-Secret</b>.</span>
      </div>
    </div>
  );
}

function UsageCell({ calls, max }: { calls: number; max: number }) {
  return (
    <div className="w-40">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-bold text-slate-500">Llamadas</span>
        <span>
          <b className="text-slate-900">{calls.toLocaleString("es-PE")}</b>
          <span className="text-slate-400"> este mes</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${calls ? Math.max(4, (calls / max) * 100) : 0}%` }} />
      </div>
    </div>
  );
}

/** Días desde una fecha (null si nunca ocurrió). */
function daysSince(value: string | null) {
  return value ? (Date.now() - new Date(value).getTime()) / 86_400_000 : null;
}

/** Conectada: llamó en los últimos 7 días · Inactiva: hace más · Sin usar: nunca llamó. */
function StatusCell({ lastUsedAt }: { lastUsedAt: string | null }) {
  const days = daysSince(lastUsedAt);
  const [label, tone, hint] =
    days === null
      ? ["Sin usar", "bg-slate-100 text-slate-600", "Aún no se conecta"]
      : days <= 7
        ? ["Conectada", "bg-emerald-100 text-emerald-800", `Último uso ${timeAgo(lastUsedAt)}`]
        : ["Inactiva", "bg-amber-100 text-amber-800", `Último uso ${timeAgo(lastUsedAt)}`];
  return (
    <div title={fmtDate(lastUsedAt)}>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${tone}`}>{label}</span>
      <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p>
    </div>
  );
}

function IconAction({ icon, tone, label, onClick }: { icon: IconName; tone: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition hover:brightness-95 ${tone}`}
    >
      <DashboardIcon name={icon} className="h-4 w-4" />
    </button>
  );
}

// ───────────────────── Ventana de credenciales ─────────────────────

function CredentialsModal({
  token,
  initial,
  scopeLabels,
  base,
  onClose,
}: {
  token: TokenRow;
  /** Credenciales recién creadas o regeneradas (el secret se muestra visible). */
  initial?: Credentials;
  scopeLabels: Record<string, string>;
  base: string;
  onClose: () => void;
}) {
  const [creds, setCreds] = useState<Credentials>(initial ?? { apiKey: token.apiKey, apiSecret: null });
  const [showSecret, setShowSecret] = useState(Boolean(initial?.apiSecret));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function revealSecret() {
    if (creds.apiSecret) {
      setShowSecret((v) => !v);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await superApi.revealApiToken(token.id);
      setCreds({ apiKey: r.apiKey, apiSecret: r.apiSecret });
      setShowSecret(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo obtener el secret.");
    } finally {
      setLoading(false);
    }
  }

  async function copy(key: string, text: string | null) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  }

  const masked = `${"•".repeat(20)}${creds.apiSecret ? creds.apiSecret.slice(-6) : ""}`;

  return (
    <Overlay onClose={onClose} size="medium">
      <div className="space-y-5">
        <header className="pr-10">
          <h2 className="text-xl font-black text-slate-950">Credenciales · {token.name}</h2>
          <p className="mt-0.5 text-sm font-medium text-slate-500">
            {companyOf(token)}
            {token.scopes.length > 0 && ` · ${token.scopes.map((s) => scopeLabels[s] ?? s).join(", ")}`}
          </p>
        </header>

        {initial?.apiSecret && (
          <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            Guarda el API Secret en un lugar seguro. Puedes volver a verlo con el botón del ojo en la lista.
          </p>
        )}

        <section className="overflow-hidden rounded-2xl ring-1 ring-violet-200">
          <div className="flex items-center justify-between bg-violet-50/70 px-5 py-3">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-violet-700">Credenciales</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-800">Datos reales</span>
          </div>
          <div className="divide-y divide-violet-100">
            <CredentialRow
              icon="globe"
              tone="bg-indigo-50 text-indigo-600"
              label="URL base"
              help="A dónde van todas las peticiones"
              value={base || "…"}
              action={<SmallButton icon={copied === "base" ? "check" : "copy"} label={copied === "base" ? "Copiado" : "Copiar"} onClick={() => copy("base", base)} />}
            />
            <CredentialRow
              icon="key"
              tone="bg-violet-50 text-violet-600"
              label="X-Api-Key"
              help="Identifica quién llama. No es secreta"
              value={creds.apiKey ?? "…"}
              action={<SmallButton icon={copied === "key" ? "check" : "copy"} label={copied === "key" ? "Copiado" : "Copiar"} onClick={() => copy("key", creds.apiKey)} />}
            />
            <CredentialRow
              icon="lock"
              tone="bg-amber-50 text-amber-600"
              label="X-Api-Secret"
              help="La que firma. No debe salir de su sistema"
              value={showSecret && creds.apiSecret ? creds.apiSecret : masked}
              muted={!showSecret}
              action={
                <div className="flex gap-1.5">
                  {showSecret && creds.apiSecret && (
                    <SmallButton icon={copied === "secret" ? "check" : "copy"} label={copied === "secret" ? "Copiado" : "Copiar"} onClick={() => copy("secret", creds.apiSecret)} />
                  )}
                  <SmallButton
                    icon={showSecret ? "eyeOff" : "eye"}
                    label={loading ? "Cargando…" : showSecret ? "Ocultar" : "Mostrar"}
                    onClick={revealSecret}
                    disabled={loading}
                  />
                </div>
              }
            />
          </div>
        </section>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <section className="grid grid-cols-2 overflow-hidden rounded-2xl ring-1 ring-slate-200 md:grid-cols-4">
          <Stat icon="activity" tone="bg-violet-50 text-violet-600" label="Llamadas este mes" value={(token.monthlyCalls ?? 0).toLocaleString("es-PE")} />
          <Stat icon="clock" tone="bg-sky-50 text-sky-600" label="Último uso" value={fmtDate(token.lastUsedAt)} />
          <Stat icon="calendar" tone="bg-emerald-50 text-emerald-600" label="Creada" value={new Date(token.createdAt).toLocaleDateString("es-PE")} />
          <Stat icon="calendar" tone="bg-amber-50 text-amber-600" label="Caduca" value="No caduca" valueTone="text-amber-600" />
        </section>

        <footer className="flex justify-end border-t border-slate-200 pt-4">
          <button onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Cerrar
          </button>
        </footer>
      </div>
    </Overlay>
  );
}

function CredentialRow({
  icon,
  tone,
  label,
  help,
  value,
  muted,
  action,
}: {
  icon: IconName;
  tone: string;
  label: string;
  help: string;
  value: string;
  muted?: boolean;
  action: React.ReactNode;
}) {
  return (
    <div className="grid items-center gap-3 bg-white px-5 py-3.5 md:grid-cols-[minmax(0,230px)_minmax(0,1fr)_auto]">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <DashboardIcon name={icon} className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-900">{label}</span>
          <span className="block truncate text-xs text-slate-500">{help}</span>
        </span>
      </div>
      <code className={`min-w-0 truncate rounded-lg bg-white px-3 py-2.5 font-mono text-xs ring-1 ring-slate-200 ${muted ? "text-slate-400" : "font-semibold text-slate-800"}`}>
        {value}
      </code>
      <div className="justify-self-start md:justify-self-end">{action}</div>
    </div>
  );
}

function SmallButton({ icon, label, onClick, disabled }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-[100px] items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-50 disabled:opacity-60"
    >
      <DashboardIcon name={icon} className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Stat({ icon, tone, label, value, valueTone = "text-slate-900" }: { icon: IconName; tone: string; label: string; value: string; valueTone?: string }) {
  return (
    <div className="flex items-center gap-3 border-slate-200 px-4 py-3 md:[&:not(:last-child)]:border-r">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <DashboardIcon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-slate-500">{label}</span>
        <span className={`block truncate text-sm font-black ${valueTone}`}>{value}</span>
      </span>
    </div>
  );
}

// ───────────────────── Editar módulos ─────────────────────

function ScopesModal({
  token,
  allScopes,
  scopeLabels,
  onClose,
  onSaved,
}: {
  token: TokenRow;
  allScopes: string[];
  scopeLabels: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(token.scopes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (selected.length === 0) return setError("Selecciona al menos un módulo.");
    setSaving(true);
    setError("");
    try {
      await superApi.updateApiTokenScopes(token.id, selected);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="space-y-4">
        <header className="pr-10">
          <h2 className="text-xl font-black text-slate-950">Módulos · {token.name}</h2>
          <p className="mt-0.5 text-sm text-slate-500">Lo único que esta integración puede consultar.</p>
        </header>
        <div className="grid grid-cols-2 gap-2">
          {allScopes.map((s) => (
            <label
              key={s}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 transition ${selected.includes(s) ? "bg-violet-50 text-violet-800 ring-violet-300" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
            >
              <input
                type="checkbox"
                checked={selected.includes(s)}
                onChange={() => setSelected((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
                className="accent-violet-600"
              />
              {scopeLabels[s] ?? s}
            </label>
          ))}
        </div>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <footer className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button onClick={save} disabled={saving} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar módulos"}
          </button>
        </footer>
      </div>
    </Overlay>
  );
}

// ───────────────────── Página ─────────────────────

export default function SaApiTokensPage() {
  const base = useApiBase();
  const [tab, setTab] = useState<"empresas" | "plataforma">("empresas");
  const [error, setError] = useState("");

  // ── Credenciales por empresa ──
  const [companies, setCompanies] = useState<{ id: string; name: string; subdomain: string }[]>([]);
  const [companyScopes, setCompanyScopes] = useState<string[]>([]);
  const [companyTokens, setCompanyTokens] = useState<SaCompanyApiTokenRow[]>([]);
  const [loadingCompanyTokens, setLoadingCompanyTokens] = useState(true);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);

  // ── Credenciales de plataforma ──
  const [platformScopes, setPlatformScopes] = useState<string[]>([]);
  const [platformTokens, setPlatformTokens] = useState<SaApiTokenRow[]>([]);
  const [loadingPlatformTokens, setLoadingPlatformTokens] = useState(true);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);

  // ── Acciones ──
  const [viewing, setViewing] = useState<{ token: TokenRow; initial?: Credentials } | null>(null);
  const [editing, setEditing] = useState<TokenRow | null>(null);
  const [regenerateTarget, setRegenerateTarget] = useState<TokenRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<TokenRow | null>(null);

  function loadCompanyData() {
    setLoadingCompanyTokens(true);
    Promise.all([superApi.apiTokenCompanies(), superApi.companyApiScopes(), superApi.companyApiTokens()])
      .then(([c, s, t]) => {
        setCompanies(c);
        setCompanyScopes(s);
        setCompanyTokens(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar."))
      .finally(() => setLoadingCompanyTokens(false));
  }
  function loadPlatformData() {
    setLoadingPlatformTokens(true);
    Promise.all([superApi.platformApiScopes(), superApi.platformApiTokens()])
      .then(([s, t]) => {
        setPlatformScopes(s);
        setPlatformTokens(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar."))
      .finally(() => setLoadingPlatformTokens(false));
  }
  useEffect(() => queueMicrotask(loadCompanyData), []);
  useEffect(() => queueMicrotask(loadPlatformData), []);

  function reload() {
    loadCompanyData();
    loadPlatformData();
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    await superApi.revokeApiToken(revokeTarget.id);
    setRevokeTarget(null);
    reload();
  }

  async function confirmRegenerate() {
    if (!regenerateTarget) return;
    const target = regenerateTarget;
    setRegenerateTarget(null);
    try {
      const creds = await superApi.regenerateApiSecret(target.id);
      setViewing({ token: target, initial: creds });
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el secret nuevo.");
    }
  }

  /** Tras crear: se abre la ventana de credenciales de la nueva integración. */
  function showCreated(list: TokenRow[], creds: Credentials) {
    const token =
      list.find((t) => t.apiKey === creds.apiKey) ??
      ({
        id: "",
        apiKey: creds.apiKey,
        name: "Nueva credencial",
        scopes: [],
        tokenPrefix: "",
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
      } satisfies SaApiTokenRow);
    setViewing({ token, initial: creds });
  }

  const isCompany = tab === "empresas";
  const scopeLabels = isCompany ? COMPANY_SCOPE_LABEL : PLATFORM_SCOPE_LABEL;
  const allScopes = isCompany ? companyScopes : platformScopes;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Integraciones</p>
        <h1 className="mt-1 text-xl font-black text-slate-950">Tokens de API</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Credenciales para que otros sistemas consulten MiTiendita: URL base + API Key + API Secret.
        </p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-6 border-b border-slate-200">
        {([
          ["empresas", "Por empresa", companyTokens.length],
          ["plataforma", "De plataforma", platformTokens.length],
        ] as const).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-bold transition ${tab === id ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {label}
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{count}</span>
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-950">
              {isCompany ? "Credenciales por tienda" : "Credenciales de plataforma"}
            </h2>
            <p className="text-xs font-medium text-slate-500">
              {isCompany
                ? `${companyTokens.length} en total. Cada una solo ve los datos de su tienda; al crearla se avisa por WhatsApp.`
                : `${platformTokens.length} en total. Para tus propios sistemas: consultan datos de toda la plataforma.`}
            </p>
          </div>
          <button
            onClick={() => (isCompany ? setCompanyModalOpen(true) : setPlatformModalOpen(true))}
            disabled={isCompany && companies.length === 0}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isCompany ? "+ Nueva credencial para una tienda" : "+ Nueva credencial"}
          </button>
        </div>

        <TokenTable
          tokens={isCompany ? companyTokens : platformTokens}
          loading={isCompany ? loadingCompanyTokens : loadingPlatformTokens}
          emptyText={isCompany ? "Aún no se creó ninguna credencial para una tienda." : "Aún no se creó ninguna credencial de plataforma."}
          scopeLabels={scopeLabels}
          base={base}
          onView={(token) => setViewing({ token })}
          onEdit={setEditing}
          onRegenerate={setRegenerateTarget}
          onRevoke={setRevokeTarget}
        />
      </div>

      {companyModalOpen && (
        <CreateCompanyApiTokenModal
          companies={companies}
          scopes={companyScopes}
          scopeLabels={COMPANY_SCOPE_LABEL}
          onClose={() => setCompanyModalOpen(false)}
          onCreate={(body) => superApi.createCompanyApiToken(body)}
          onCreated={async (creds) => {
            setCompanyModalOpen(false);
            const list = await superApi.companyApiTokens().catch(() => companyTokens);
            setCompanyTokens(list);
            showCreated(list, creds);
          }}
        />
      )}

      {platformModalOpen && (
        <CreateApiTokenModal
          scopes={platformScopes}
          scopeLabels={PLATFORM_SCOPE_LABEL}
          onClose={() => setPlatformModalOpen(false)}
          onCreate={(body) => superApi.createPlatformApiToken(body)}
          onCreated={async (creds) => {
            setPlatformModalOpen(false);
            const list = await superApi.platformApiTokens().catch(() => platformTokens);
            setPlatformTokens(list);
            showCreated(list, creds);
          }}
        />
      )}

      {viewing && (
        <CredentialsModal
          key={viewing.token.id + (viewing.initial?.apiSecret ?? "")}
          token={viewing.token}
          initial={viewing.initial}
          scopeLabels={"companyName" in viewing.token ? COMPANY_SCOPE_LABEL : scopeLabels}
          base={base}
          onClose={() => setViewing(null)}
        />
      )}

      {editing && (
        <ScopesModal
          token={editing}
          allScopes={allScopes}
          scopeLabels={scopeLabels}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {regenerateTarget && (
        <ConfirmDialog
          title="¿Generar un API Secret nuevo?"
          message={`El secret actual de «${regenerateTarget.name}» dejará de funcionar de inmediato. La API Key se mantiene. Úsalo si el secret se filtró.`}
          confirmLabel="Generar nuevo secret"
          onConfirm={confirmRegenerate}
          onCancel={() => setRegenerateTarget(null)}
        />
      )}

      {revokeTarget && (
        <ConfirmDialog
          title="¿Eliminar esta credencial?"
          message="Se borra por completo: el sistema que la use dejará de funcionar de inmediato y no se puede deshacer."
          confirmLabel="Eliminar"
          danger
          onConfirm={confirmRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}
