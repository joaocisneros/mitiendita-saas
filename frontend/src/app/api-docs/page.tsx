import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentación de la API — MiTiendita",
  description: "Referencia técnica de los endpoints de integración de MiTiendita: autenticación, módulos y ejemplos.",
};

const REASON_STATUS: { code: string; tone: "ok" | "warn" | "danger"; text: string }[] = [
  { code: "200", tone: "ok", text: "Todo bien, la respuesta trae los datos pedidos." },
  { code: "401", tone: "danger", text: "Falta el header Authorization, o el token no existe / fue eliminado." },
  { code: "403", tone: "warn", text: "El token es válido, pero no tiene marcado el módulo que estás pidiendo." },
  { code: "400", tone: "danger", text: "Falta un dato requerido (ej. un token de plataforma llamando algo que exige tienda)." },
];

const TONE_CLASS: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
};

function Endpoint({
  path,
  scope,
  desc,
  params,
  example,
}: {
  path: string;
  scope: string;
  desc: string;
  params?: { name: string; opt?: boolean; detail: string }[];
  example: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">GET</span>
        <span className="font-mono text-sm font-bold text-slate-900">{path}</span>
        <span className="ml-auto rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-violet-700">
          scope: {scope}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-700">{desc}</p>
      {params && params.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="pb-1.5 pr-3 font-bold uppercase tracking-wide">Parámetro</th>
                <th className="pb-1.5 pr-3 font-bold uppercase tracking-wide">Tipo</th>
                <th className="pb-1.5 font-bold uppercase tracking-wide">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {params.map((p) => (
                <tr key={p.name}>
                  <td className="whitespace-nowrap py-1.5 pr-3 font-mono font-bold text-slate-800">{p.name}</td>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-slate-500">{p.opt === false ? "requerido" : "opcional"}</td>
                  <td className="py-1.5 text-slate-600">{p.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 overflow-x-auto rounded-xl bg-slate-50 ring-1 ring-slate-200">
        <p className="px-3 pt-2 text-[10px] font-black uppercase tracking-wide text-slate-500">Respuesta 200</p>
        <pre className="px-3 pb-3 pt-1 font-mono text-xs leading-relaxed text-slate-800">{example}</pre>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <main className="flex-1 bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            Mi<span className="text-violet-600">Tiendita</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-violet-700">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-10 px-5 py-12">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-violet-700">Documentación técnica</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Referencia de la API de integraciones
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Cómo un sistema externo (tuyo o de un tercero) puede leer los datos de MiTiendita usando un token de
            API creado desde el Superadmin. Cada token trae permiso solo a los módulos que se le marcaron al
            crearlo.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-slate-950 p-5 text-slate-100 shadow-lg">
          <pre className="font-mono text-sm leading-relaxed">
{`$ curl https://mitiendita-saas.onrender.com/api/v1/pedidos \\
    -H "Authorization: Bearer mt_live_...tu_token..."`}
          </pre>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Base URL · producción</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
              https://mitiendita-saas.onrender.com/api
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Encabezado de autorización</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
              Authorization: Bearer mt_live_...
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-xs font-black uppercase tracking-wide text-amber-800">Cómo se obtiene el token</p>
          <p className="mt-1.5 text-sm text-amber-900">
            Los tokens los crea siempre el <strong>Superadmin</strong>, nunca el dueño de la tienda directamente.
            Si el token es para una tienda puntual, la plataforma le avisa el valor por WhatsApp al crearlo. Un
            token revocado o eliminado deja de funcionar de inmediato — no hay forma de recuperarlo, hay que
            pedir uno nuevo.
          </p>
        </div>

        <section>
          <div className="mb-3 flex items-baseline gap-2 border-t border-slate-200 pt-8">
            <p className="text-sm font-bold uppercase tracking-wide text-violet-700">Módulos de tienda</p>
            <span className="font-mono text-xs text-slate-500">6 endpoints · token creado para UNA empresa</span>
          </div>
          <div className="space-y-3">
            <Endpoint
              path="/v1/pedidos"
              scope="pedidos"
              desc="Lista los pedidos de la tienda, más recientes primero."
              params={[
                { name: "status", detail: "pending · confirmed · preparing · out_for_delivery · delivered · cancelled · expired" },
                { name: "page", detail: "Página, empieza en 1" },
                { name: "limit", detail: "Resultados por página (máx. 100)" },
              ]}
              example={`{
  "items": [
    { "id": "ef26a193-...", "publicCode": "MT-DQ4WUV", "status": "delivered",
      "paymentStatus": "approved", "deliveryMethod": "pickup",
      "customerName": "Ana Torres", "customerPhone": "987654321",
      "total": "29.9", "currency": "PEN", "createdAt": "2026-07-26T01:33:19.591Z" }
  ],
  "total": 2, "page": 1, "limit": 20, "pages": 1
}`}
            />
            <Endpoint
              path="/v1/productos"
              scope="productos"
              desc="Catálogo de productos de la tienda, con precio y stock."
              params={[
                { name: "search", detail: "Busca por nombre" },
                { name: "page / limit", detail: "Paginación (límite máx. 100)" },
              ]}
              example={`{
  "items": [
    { "id": "e0538235-...", "name": "Camiseta básica", "slug": "camiseta-basica",
      "price": "39.9", "stock": 10, "reserved": 0, "sku": null,
      "isActive": true, "isFeatured": false, "createdAt": "2026-06-23T21:09:48.207Z" }
  ],
  "total": 9, "page": 1, "limit": 20, "pages": 1
}`}
            />
            <Endpoint
              path="/v1/clientes"
              scope="clientes"
              desc="Clientes que ya compraron en la tienda, con su historial acumulado."
              params={[
                { name: "search", detail: "Busca por nombre o teléfono" },
                { name: "page / limit", detail: "Paginación" },
              ]}
              example={`{
  "items": [
    { "id": "78a7fc4e-...", "name": "Lucía Fernández", "phone": "912345678",
      "address": null, "ordersCount": 3, "totalSpent": "128.50",
      "firstPurchaseAt": "2026-06-24T16:09:08.744Z", "lastPurchaseAt": "2026-07-10T13:02:00.000Z" }
  ],
  "total": 14, "page": 1, "pages": 1
}`}
            />
            <Endpoint
              path="/v1/inventario"
              scope="inventario"
              desc="Stock disponible por producto ahora mismo. Sin parámetros ni paginación: siempre trae la foto completa."
              example={`[
  { "id": "e0538235-...", "name": "Camiseta básica", "sku": null,
    "stock": 10, "reserved": 2, "available": 8, "isActive": true }
]`}
            />
            <Endpoint
              path="/v1/reportes"
              scope="reportes"
              desc="Resumen de ventas del rango de fechas indicado (por defecto, los últimos 30 días)."
              params={[
                { name: "from", detail: "Fecha inicio, AAAA-MM-DD" },
                { name: "to", detail: "Fecha fin, AAAA-MM-DD" },
              ]}
              example={`{
  "from": "2026-06-27", "to": "2026-07-26",
  "totalRevenue": "1284.50", "totalOrders": 24,
  "salesByDay": [{ "date": "2026-07-20", "revenue": "89.90", "orders": 3 }],
  "ordersByStatus": [{ "status": "delivered", "count": 18 }],
  "topProducts": [{ "name": "Camiseta básica", "units": 12, "revenue": "478.80" }],
  "frequentCustomers": [{ "name": "Lucía Fernández", "phone": "912345678", "orders": 3, "total": "128.50" }]
}`}
            />
            <Endpoint
              path="/v1/citas"
              scope="citas"
              desc="Reservas de servicio del negocio (solo aplica a tiendas del rubro servicios)."
              params={[{ name: "status", detail: "Filtra por estado de la cita" }]}
              example={`[
  { "id": "9c1a...", "serviceName": "Corte + barba",
    "customerName": "Carlos Ruiz", "customerPhone": "987654321",
    "preferredAt": "2026-07-28T15:00:00.000Z", "status": "confirmed",
    "paymentMode": "advance", "advanceAmount": "15.00", "paymentStatus": "approved" }
]`}
            />
          </div>
        </section>

        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-xs font-black uppercase tracking-wide text-amber-800">Módulo compartido: suscripciones</p>
          <p className="mt-1.5 text-sm text-amber-900">
            <code className="rounded bg-white/60 px-1 py-0.5 font-mono">GET /v1/suscripciones</code> existe para
            los dos tipos de token, pero responde contenido distinto según cuál uses — el token ya dice quién
            eres:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            <li>
              · <strong>Token de tienda</strong> → sus propias solicitudes de plan digital (acepta{" "}
              <code className="rounded bg-white/60 px-1 py-0.5 font-mono">?filter=active|expiring|expired|pending|cancelled</code>).
            </li>
            <li>
              · <strong>Token de plataforma</strong> → las suscripciones comerciales de todas las tiendas (acepta{" "}
              <code className="rounded bg-white/60 px-1 py-0.5 font-mono">?filter=</code> y{" "}
              <code className="rounded bg-white/60 px-1 py-0.5 font-mono">?search=</code>).
            </li>
          </ul>
        </div>

        <section>
          <div className="mb-3 flex items-baseline gap-2 border-t border-slate-200 pt-8">
            <p className="text-sm font-bold uppercase tracking-wide text-violet-700">Módulos de plataforma</p>
            <span className="font-mono text-xs text-slate-500">6 endpoints · token de Superadmin, sin tienda asociada</span>
          </div>
          <div className="space-y-3">
            <Endpoint
              path="/v1/empresas"
              scope="empresas"
              desc="Todas las tiendas de la plataforma, con su plan y estado de suscripción."
              params={[{ name: "page / limit", detail: "Paginación" }]}
              example={`{
  "items": [
    { "id": "7783273e-...", "name": "Mi Tienda Demo", "subdomain": "mi-tienda-demo",
      "status": "active", "plan": { "id": 1, "name": "Básico", "slug": "basico" },
      "owner": { "name": "Lucía Fernández", "email": "hola@mitiendademo.example" },
      "orders": 5, "products": 7, "customers": 1,
      "subscriptionStatus": "active", "currentPeriodEndsAt": "2027-07-26T17:00:00.000Z" }
  ],
  "total": 100, "page": 1, "limit": 20, "pages": 5
}`}
            />
            <Endpoint
              path="/v1/usuarios"
              scope="usuarios"
              desc="Todos los usuarios (dueños y empleados) de todas las tiendas."
              params={[
                { name: "search", detail: "Nombre o correo" },
                { name: "page / limit", detail: "Paginación" },
              ]}
              example={`{
  "items": [
    { "id": "a1b2...", "name": "Lucía Fernández", "email": "duena@ejemplo.test",
      "isActive": true, "role": "OWNER", "company": { "id": "c8ab...", "name": "Bodega Demo" } }
  ],
  "total": 42, "page": 1, "pages": 3
}`}
            />
            <Endpoint
              path="/v1/planes"
              scope="planes"
              desc="Los planes comerciales configurados (Básico, Pro, Premium...), activos e inactivos."
              example={`[
  { "id": 1, "name": "Básico", "slug": "basico", "priceMonth": "39.00",
    "maxProducts": 30, "isActive": true }
]`}
            />
            <Endpoint
              path="/v1/actividad"
              scope="actividad"
              desc="Bitácora de acciones sensibles hechas por administradores de la plataforma."
              params={[
                { name: "action", detail: "Filtra por tipo de acción (ej. company.suspended)" },
                { name: "page", detail: "Paginación" },
              ]}
              example={`{
  "items": [
    { "id": "9f1a...", "action": "subscription.paid",
      "superAdmin": { "name": "Administrador", "email": "admin@mitiendita.com" },
      "companyId": "7783...", "companyName": "Mi Tienda Demo", "createdAt": "2026-07-25T18:04:00.000Z" }
  ],
  "total": 630, "page": 1, "pages": 21
}`}
            />
            <Endpoint
              path="/v1/whatsapp"
              scope="whatsapp"
              desc="Dueños y clientes de todas las tiendas con su número de WhatsApp registrado."
              example={`{
  "duenos": [
    { "companyId": "7783...", "companyName": "Mi Tienda Demo", "usuario": "Lucía Fernández", "whatsapp": "51987654321" }
  ],
  "clientes": [
    { "id": "78a7...", "cliente": "Carlos Ruiz", "telefono": "51987654321", "companyName": "Mi Tienda Demo" }
  ]
}`}
            />
            <Endpoint
              path="/v1/configuracion"
              scope="configuracion"
              desc="Configuración general de la plataforma (nombre, dominio, moneda, textos legales). No incluye nada de la integración de Twilio."
              example={`{
  "id": 1, "platformName": "MiTiendita", "logoUrl": null,
  "mainDomain": "mitiendita.com", "currency": "PEN",
  "supportWhatsapp": "987654321", "supportEmail": "soporte@mitiendita.com",
  "trialDays": 30, "updatedAt": "2026-06-23T02:23:22.878Z"
}`}
            />
          </div>
        </section>

        <section>
          <div className="mb-3 border-t border-slate-200 pt-8">
            <p className="text-sm font-bold uppercase tracking-wide text-violet-700">Errores</p>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {REASON_STATUS.map((r) => (
                  <tr key={r.code}>
                    <td className="w-24 p-4">
                      <span className={`rounded px-2 py-0.5 font-mono text-xs font-black ${TONE_CLASS[r.tone]}`}>{r.code}</span>
                    </td>
                    <td className="p-4 text-slate-700">{r.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
          Cada token queda atado a una sola tienda (o a plataforma, si lo creó el Superadmin sin elegir empresa) —
          nunca puede leer datos de una tienda distinta a la suya. Límite de uso:{" "}
          <span className="font-mono font-semibold text-slate-700">60 peticiones/minuto</span> por token en todos
          los endpoints <span className="font-mono font-semibold text-slate-700">/v1/*</span>.
        </footer>
      </div>
    </main>
  );
}
