"use client";

import { useEffect, useState } from "react";
import { superApi, type SaApiTokenRow, type SaCompanyApiTokenRow } from "@/lib/superadmin-api";
import { DashboardIcon } from "@/components/DashboardIcon";
import { CreateApiTokenModal } from "@/components/ApiTokenModal";
import { CreateCompanyApiTokenModal } from "@/components/CompanyApiTokenModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const PLATFORM_SCOPE_LABEL: Record<string, string> = {
  empresas: "Empresas",
  usuarios: "Usuarios",
  planes: "Planes",
  suscripciones: "Suscripciones",
  actividad: "Actividad",
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
};

function TokenRow({
  token: t,
  scopeLabels,
  onRevoke,
  showCompany,
}: {
  token: SaApiTokenRow | SaCompanyApiTokenRow;
  scopeLabels: Record<string, string>;
  onRevoke: (id: string) => void;
  showCompany?: boolean;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState("");
  const [copied, setCopied] = useState(false);

  async function toggleReveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    setRevealing(true);
    setRevealError("");
    try {
      const { token } = await superApi.revealApiToken(t.id);
      setRevealed(token);
    } catch (e) {
      setRevealError(e instanceof Error ? e.message : "No se pudo obtener el token.");
    } finally {
      setRevealing(false);
    }
  }

  async function copy() {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <DashboardIcon name="key" className="h-4 w-4" />
          </span>
          <p className="font-bold text-slate-900">{t.name}</p>
        </div>
        {showCompany && "companyName" in t && (
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {t.companyName} ({t.companySubdomain})
          </p>
        )}
        {revealed ? (
          <div className="mt-1 flex items-center gap-2">
            <code className="truncate font-mono text-xs font-bold text-emerald-700">{revealed}</code>
            <button
              onClick={copy}
              title={copied ? "¡Copiado!" : "Copiar"}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${copied ? "text-emerald-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}
            >
              <DashboardIcon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        ) : (
          <p className="mt-1 font-mono text-xs text-slate-500">{t.tokenPrefix}••••••••</p>
        )}
        {revealError && <p className="mt-1 text-xs font-semibold text-red-600">{revealError}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {t.scopes.map((s) => (
            <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {scopeLabels[s] ?? s}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start">
        <button
          onClick={toggleReveal}
          disabled={revealing}
          className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-60"
        >
          {revealing ? "Cargando..." : revealed ? "Ocultar" : "Ver"}
        </button>
        <button
          onClick={() => onRevoke(t.id)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}

function TokenList({
  tokens,
  loading,
  emptyText,
  scopeLabels,
  onRevoke,
  showCompany,
}: {
  tokens: (SaApiTokenRow | SaCompanyApiTokenRow)[];
  loading: boolean;
  emptyText: string;
  scopeLabels: Record<string, string>;
  onRevoke: (id: string) => void;
  showCompany?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {loading && <p className="p-8 text-center text-sm font-medium text-slate-500">Cargando...</p>}
      {!loading && tokens.length === 0 && <p className="p-8 text-center text-sm font-medium text-slate-500">{emptyText}</p>}
      {tokens.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {tokens.map((t) => (
            <TokenRow key={t.id} token={t} scopeLabels={scopeLabels} onRevoke={onRevoke} showCompany={showCompany} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SaApiTokensPage() {
  const [tab, setTab] = useState<"empresas" | "plataforma">("empresas");
  const [error, setError] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  // ── Tokens por empresa ──
  const [companies, setCompanies] = useState<{ id: string; name: string; subdomain: string }[]>([]);
  const [companyScopes, setCompanyScopes] = useState<string[]>([]);
  const [companyTokens, setCompanyTokens] = useState<SaCompanyApiTokenRow[]>([]);
  const [loadingCompanyTokens, setLoadingCompanyTokens] = useState(true);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);

  // ── Tokens de plataforma ──
  const [platformScopes, setPlatformScopes] = useState<string[]>([]);
  const [platformTokens, setPlatformTokens] = useState<SaApiTokenRow[]>([]);
  const [loadingPlatformTokens, setLoadingPlatformTokens] = useState(true);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);

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
  useEffect(loadCompanyData, []);
  useEffect(loadPlatformData, []);

  async function confirmRevoke() {
    if (!revokeTarget) return;
    await superApi.revokeApiToken(revokeTarget);
    setRevokeTarget(null);
    loadCompanyData();
    loadPlatformData();
  }

  return (
    <div className="max-w-3xl space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Integraciones</p>
        <h1 className="mt-1 text-xl font-black text-slate-950">Tokens de API</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Tú creas cada token: uno por tienda (avisando por WhatsApp) o uno de plataforma para tus propios módulos.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          onClick={() => setTab("empresas")}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${tab === "empresas" ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          Tokens por empresa
        </button>
        <button
          onClick={() => setTab("plataforma")}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${tab === "plataforma" ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          Mis tokens de plataforma
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {tab === "empresas" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setCompanyModalOpen(true)}
              disabled={companies.length === 0}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              + Nuevo token para una tienda
            </button>
          </div>
          <TokenList
            tokens={companyTokens}
            loading={loadingCompanyTokens}
            emptyText="Aún no se creó ningún token para ninguna tienda."
            scopeLabels={COMPANY_SCOPE_LABEL}
            onRevoke={setRevokeTarget}
            showCompany
          />
        </div>
      )}

      {tab === "plataforma" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setPlatformModalOpen(true)}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
            >
              + Nuevo token
            </button>
          </div>
          <TokenList
            tokens={platformTokens}
            loading={loadingPlatformTokens}
            emptyText="Aún no se creó ningún token de plataforma."
            scopeLabels={PLATFORM_SCOPE_LABEL}
            onRevoke={setRevokeTarget}
          />
        </div>
      )}

      {companyModalOpen && (
        <CreateCompanyApiTokenModal
          companies={companies}
          scopes={companyScopes}
          scopeLabels={COMPANY_SCOPE_LABEL}
          onClose={() => setCompanyModalOpen(false)}
          onCreate={(body) => superApi.createCompanyApiToken(body)}
          onCreated={loadCompanyData}
        />
      )}

      {platformModalOpen && (
        <CreateApiTokenModal
          scopes={platformScopes}
          scopeLabels={PLATFORM_SCOPE_LABEL}
          onClose={() => setPlatformModalOpen(false)}
          onCreate={(body) => superApi.createPlatformApiToken(body)}
          onCreated={loadPlatformData}
        />
      )}

      {revokeTarget && (
        <ConfirmDialog
          title="¿Eliminar este token?"
          message="Se borra por completo: el sistema que lo use dejará de funcionar de inmediato y no se puede deshacer."
          confirmLabel="Eliminar"
          danger
          onConfirm={confirmRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}
