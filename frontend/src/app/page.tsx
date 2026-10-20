import Image from "next/image";
import Link from "next/link";
import { getPublicLegal, getPublicPlans, type PublicPlan } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { supportNumber, whatsappLink } from "@/lib/contact";

// Tienda de ejemplo para la landing. Solo se muestra el botón si está definida,
// así en producción no queda un enlace roto si no quieres mostrar ninguna.
const DEMO = process.env.NEXT_PUBLIC_DEMO_STORE ?? "";

// Los 11 rubros del sistema con nombres que reconoce cualquier negocio (Ropa sale aparte de Comercio).
const POPULAR_BUSINESSES = [
  { emoji: "🛒", label: "Bodegas y tiendas" },
  { emoji: "👕", label: "Ropa y calzado" },
  { emoji: "🍕", label: "Restaurantes y comida" },
  { emoji: "💅", label: "Belleza y barberías" },
  { emoji: "🏥", label: "Salud y consultorios" },
  { emoji: "🎓", label: "Academias y colegios" },
  { emoji: "🏨", label: "Hoteles y turismo" },
  { emoji: "🚗", label: "Talleres y autos" },
  { emoji: "🏠", label: "Inmobiliarias" },
  { emoji: "🧹", label: "Servicios a domicilio" },
  { emoji: "🎬", label: "Cursos y membresías" },
  { emoji: "📡", label: "Internet y celulares" },
];

// Lo que ofrece MiTiendita, juntado en 4 grupos para que se lea rápido.
const featureGroups = [
  {
    icon: "🏪",
    title: "Vende en línea",
    subtitle: "Tu tienda abierta las 24 horas",
    soft: "bg-violet-50 text-violet-700",
    items: [
      ["🛍️", "Catálogo en minutos", "Sube productos o servicios y comparte tu link"],
      ["📱", "Pedidos por WhatsApp", "Llegan ordenados a tu chat"],
      ["👕", "Tallas y colores", "Con el stock de cada uno"],
      ["🗂️", "Categorías", "Tus clientes encuentran todo rápido"],
      ["🎨", "Con tu marca", "Tu logo y tus colores"],
      ["🔎", "Aparece en Google", "Te encuentran al buscarte"],
    ],
  },
  {
    icon: "💳",
    title: "Cobra y entrega",
    subtitle: "Pagos y envíos sin enredos",
    soft: "bg-fuchsia-50 text-fuchsia-700",
    items: [
      ["💜", "Yape y Plin", "Con el comprobante del cliente"],
      ["🚚", "Delivery o recojo", "El cliente elige al pedir"],
      ["🤝", "Ventas al crédito", "Anota abonos y quién te debe"],
      ["🧾", "Recibos", "Listos para imprimir o enviar"],
    ],
  },
  {
    icon: "🗓️",
    title: "Citas y cuotas",
    subtitle: "Reservas y pagos mensuales",
    soft: "bg-sky-50 text-sky-700",
    items: [
      ["📅", "Reservas y citas", "Barberías, spas y consultorios"],
      ["🔁", "Suscripciones", "Cobra mensualidades fijas"],
      ["⏰", "Vencimientos", "Controlados automáticamente"],
    ],
  },
  {
    icon: "📈",
    title: "Controla tu negocio",
    subtitle: "Stock, ventas y ganancias",
    soft: "bg-emerald-50 text-emerald-700",
    items: [
      ["📦", "Inventario al día", "Con alertas de bajo stock"],
      ["📊", "Reportes", "Ventas y productos más vendidos"],
      ["💰", "Tu ganancia real", "Costo privado y Excel del mes"],
      ["👥", "Tus clientes", "Teléfono, compras e historial"],
    ],
  },
];

const steps = [
  {
    n: "1",
    time: "1 minuto",
    title: "Crea tu cuenta",
    text: "Regístrate gratis y elige el rubro de tu negocio.",
  },
  {
    n: "2",
    time: "5 minutos",
    title: "Sube tus productos",
    text: "Agrega fotos, precios y tu QR de Yape o Plin.",
  },
  {
    n: "3",
    time: "¡Listo!",
    title: "Comparte y vende",
    text: "Comparte tu link en tus redes o WhatsApp y recibe pedidos, reservas y pagos al instante.",
  },
];

/** Preguntas frecuentes. Las respuestas siguen lo que dicen los Términos (sección 5). */
function faqsFor(trialDays: number) {
  return [
    {
      q: "¿Necesito conocimientos técnicos?",
      a: "No. Si sabes usar WhatsApp, sabes usar MiTiendita. Todo se maneja desde tu celular.",
    },
    {
      q: "¿Sirve para mi tipo de negocio?",
      a: "Sí. Bodegas, ropa, restaurantes, barberías, consultorios, academias y más: cada rubro trae sus funciones.",
    },
    {
      q: "¿Cómo cobro a mis clientes?",
      a: "Muestras tu QR de Yape o Plin. El cliente paga y sube su comprobante; tú lo confirmas desde tu panel.",
    },
    {
      q: "¿Cobran comisión por mis ventas?",
      a: "No. El dinero de tus ventas va directo a tu Yape o Plin. Solo pagas el precio fijo de tu plan.",
    },
    {
      q: "¿Puedo probar antes de pagar?",
      a: `Sí. Tienes ${trialDays} días gratis para crear tu tienda y vender, sin tarjeta de crédito.`,
    },
    {
      q: "¿Qué pasa cuando termina la prueba?",
      a: "Eliges un plan y lo pagas con Yape o Plin. Si no, tu tienda se pausa, pero tus datos se guardan.",
    },
    {
      q: "¿Puedo cancelar cuando quiera?",
      a: "Sí. No hay contratos ni permanencia: dejas de pagar y listo. Si lo pides, te damos una copia de tu información.",
    },
    {
      q: "¿Puedo cambiar de plan después?",
      a: "Sí. Si tu negocio crece, escríbenos por WhatsApp y te pasamos a un plan con más productos y funciones.",
    },
  ];
}

/** Lo que traen todos los planes. Algunas funciones dependen del rubro (citas, delivery). */
const BASE_FEATURES = [
  "Tienda online con tu propio link",
  "Pedidos o reservas directo a tu WhatsApp",
  "Cobros con Yape y Plin",
  "Delivery, recojo o citas, según tu negocio",
  "Control de stock, con tallas y colores",
  "Reportes de ventas en pantalla",
  "Tu tienda visible en Google",
  "Maneja todo desde tu celular",
];

/** Lo que cambia según el plan (lo marca el superadmin en Planes). */
function planExtras(plan: PublicPlan): { label: string; included: boolean }[] {
  return [
    {
      label: `Hasta ${plan.maxImages ?? 12} fotos por producto`,
      included: true,
    },
    {
      label: "Excel con tu ganancia del mes",
      included: plan.featExcel ?? true,
    },
    {
      label: "Ventas al crédito con abonos (según tu rubro)",
      included: plan.featCredits ?? true,
    },
    {
      label: "Título y descripción propios para Google",
      included: plan.featSeo ?? true,
    },
    {
      label: "Tu tienda sin la marca MiTiendita",
      included: plan.featNoBranding ?? false,
    },
    plan.featPrioritySupport
      ? { label: "Soporte prioritario por WhatsApp", included: true }
      : { label: "Soporte por WhatsApp", included: true },
    { label: "Te dejamos la tienda lista", included: plan.featSetup ?? false },
  ];
}

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://mitiendita-saas.vercel.app"
).replace(/\/$/, "");

export default async function Home() {
  const [plans, legal] = await Promise.all([
    getPublicPlans(),
    getPublicLegal(),
  ]);
  // Días de prueba y WhatsApp de ventas: los configurados en el superadmin.
  const trialDays = legal?.trialDays ?? 14;
  const salesWhatsapp = supportNumber(legal?.supportWhatsapp);

  return (
    <main className="flex-1">
      {/* Nombre del sitio para Google (aparece arriba de cada resultado). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MiTiendita",
            alternateName: ["Mi Tiendita", "MiTiendita Perú"],
            url: `${SITE_URL}/`,
          }),
        }}
      />
      {/* Encabezado */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <span className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
            <Image
              src="/logo.svg"
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-xl shadow-sm"
            />
            <span>
              Mi<span className="text-violet-600">Tiendita</span>
            </span>
          </span>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/panel/login"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-block"
            >
              Ingresar
            </Link>
            <Link
              href="/registro"
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              Crear mi tienda
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-violet-50 via-white to-white" />
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm ring-1 ring-violet-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Hecho para negocios del Perú 🇵🇪
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.4rem]">
              Vende más con tu{" "}
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                tienda online
              </span>
              , lista en minutos
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600 lg:mx-0">
              Deja el desorden de WhatsApp. Publica tus productos, recibe
              pedidos ordenados y cobra con Yape o Plin, todo desde tu celular.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/registro"
                className="w-full rounded-xl bg-violet-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700 sm:w-auto"
              >
                Crear mi tienda gratis
              </Link>
              {DEMO && (
                <Link
                  href={`/tienda/${DEMO}`}
                  className="w-full rounded-xl bg-white px-7 py-3.5 font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:ring-violet-300 sm:w-auto"
                >
                  Ver tienda de ejemplo →
                </Link>
              )}
            </div>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600 lg:justify-start">
              {[
                "Sin tarjeta de crédito",
                "Sin contratos",
                "Listo para vender hoy",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Vista de una tienda en el celular (hecha con código, carga al instante) */}
          <div className="relative mx-auto hidden w-full max-w-[300px] sm:block" aria-hidden>
            <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-tr from-violet-200/60 to-fuchsia-200/40 blur-3xl" />
            <div className="rounded-[2.4rem] bg-slate-900 p-2.5 shadow-2xl shadow-violet-900/20">
              <div className="overflow-hidden rounded-[1.9rem] bg-white">
                <div className="bg-gradient-to-r from-rose-600 to-amber-500 px-4 pb-4 pt-6 text-white">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg">🍕</span>
                    <div>
                      <p className="text-sm font-bold leading-tight">Pizzería Bella Nápoli</p>
                      <p className="text-[10px] text-white/80">Abierto · Delivery y recojo</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 px-3 pt-3 text-[10px] font-semibold">
                  <span className="rounded-full bg-rose-600 px-2.5 py-1 text-white">Todo</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Pizzas</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Bebidas</span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3">
                  {[
                    ["🍕", "Pizza Americana", "S/ 32.00", "from-amber-100 to-orange-100"],
                    ["🍕", "Pizza Hawaiana", "S/ 35.00", "from-yellow-100 to-amber-100"],
                    ["🥤", "Gaseosa 1.5 L", "S/ 9.00", "from-sky-100 to-indigo-100"],
                    ["🍰", "Torta de chocolate", "S/ 12.00", "from-rose-100 to-pink-100"],
                  ].map(([emoji, name, price, bg]) => (
                    <div key={name} className="rounded-xl ring-1 ring-slate-100">
                      <div className={`grid h-16 place-items-center rounded-t-xl bg-gradient-to-br ${bg} text-2xl`}>
                        {emoji}
                      </div>
                      <div className="p-2">
                        <p className="truncate text-[10px] font-semibold text-slate-800">{name}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[11px] font-black text-slate-900">{price}</span>
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-rose-600 text-xs font-bold text-white">+</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mx-3 mb-4 flex items-center justify-between rounded-xl bg-emerald-500 px-3 py-2.5 text-[11px] font-bold text-white">
                  <span>Pedir por WhatsApp</span>
                  <span>S/ 67.00</span>
                </div>
              </div>
            </div>
            <div className="absolute -left-14 top-24 flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-xl ring-1 ring-slate-100">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-sm">🛎️</span>
              <div>
                <p className="text-[11px] font-bold text-slate-900">Nuevo pedido</p>
                <p className="text-[10px] text-slate-500">#1042 · S/ 67.00</p>
              </div>
            </div>
            <div className="absolute -right-12 bottom-24 flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-xl ring-1 ring-slate-100">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-sm">💜</span>
              <div>
                <p className="text-[11px] font-bold text-slate-900">Pago con Yape</p>
                <p className="text-[10px] text-emerald-600">Comprobante recibido</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rubros / categorías */}
      <section className="border-y border-black/5 bg-white py-14">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Para todo tipo de negocio
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
            Cada rubro tiene su propia tienda, con las funciones que realmente
            necesita.
          </p>
          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 lg:grid-cols-4">
            {POPULAR_BUSINESSES.map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-black/5"
              >
                <span className="text-2xl">{b.emoji}</span>
                <span className="text-sm font-bold leading-tight text-slate-800">
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-14">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Empieza en 3 pasos
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
            Tu tienda vendiendo hoy mismo, sin saber de tecnología.
          </p>
          <div className="relative mt-8 grid gap-5 sm:mt-10 sm:grid-cols-3 sm:gap-6">
            <div className="absolute left-[16.6%] right-[16.6%] top-6 hidden h-0.5 bg-gradient-to-r from-violet-200 via-violet-400 to-violet-200 sm:block" />
            {steps.map((s) => (
              <div key={s.n} className="relative flex items-start gap-4 text-left sm:block sm:text-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-lg font-black text-white shadow-lg shadow-violet-600/25 ring-4 ring-white sm:mx-auto">
                  {s.n}
                </div>
                <div>
                <span className="inline-block rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700 sm:mt-3">
                  {s.time}
                </span>
                <h3 className="mt-2 font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-600 sm:mx-auto sm:max-w-[16rem]">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Todo lo que tu negocio necesita
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
            Todo incluido en una sola herramienta, desde tu celular.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureGroups.map((g) => (
              <div
                key={g.title}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex items-center gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl ${g.soft}`}>
                    {g.icon}
                  </span>
                  <div>
                    <h3 className="font-extrabold leading-tight text-slate-900">{g.title}</h3>
                    <p className="text-xs text-slate-500">{g.subtitle}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {g.items.map(([icon, title, text]) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-lg ring-1 ring-slate-100">
                        {icon}
                      </span>
                      <span className="leading-snug">
                        <b className="block text-sm font-semibold text-slate-900">{title}</b>
                        <span className="text-xs text-slate-500">{text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Precios simples y claros
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
            Empieza gratis y crece cuando lo necesites. Sin contratos ni
            sorpresas.
          </p>

          {plans.length > 0 ? (
            <>
              {/* Columnas según la cantidad de planes (1 a 4) para que ninguno quede solo abajo. */}
              <div
                className={`mx-auto mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 ${
                  plans.length >= 4
                    ? "max-w-6xl lg:grid-cols-4"
                    : plans.length === 3
                      ? "max-w-5xl lg:grid-cols-3"
                      : plans.length === 2
                        ? "max-w-3xl"
                        : "max-w-sm sm:grid-cols-1"
                }`}
              >
                {plans.map((plan, i) => {
                  // "Más popular": el plan Pro; si no existe, el del medio.
                  const featured = plans.some((p) => p.slug === "pro")
                    ? plan.slug === "pro"
                    : i === Math.floor((plans.length - 1) / 2);
                  return (
                    <article
                      key={plan.id}
                      className={`relative flex flex-col rounded-2xl p-6 ${
                        featured
                          ? "bg-violet-600 text-white shadow-xl shadow-violet-600/25 ring-1 ring-violet-600"
                          : "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                      }`}
                    >
                      {featured && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black text-amber-950">
                          Más popular
                        </span>
                      )}
                      <h3
                        className={`text-lg font-black ${featured ? "text-white" : "text-slate-900"}`}
                      >
                        {plan.name}
                      </h3>
                      <p className="mt-4 text-3xl font-black">
                        {formatPrice(plan.priceMonth)}
                        <span
                          className={`text-sm font-semibold ${featured ? "text-violet-200" : "text-slate-500"}`}
                        >
                          {" "}
                          / mes
                        </span>
                      </p>
                      <p
                        className={`mt-4 rounded-xl px-3 py-2 text-sm font-black ${featured ? "bg-white/15 text-white" : "bg-violet-50 text-violet-800"}`}
                      >
                        📦{" "}
                        {plan.maxProducts == null
                          ? "Productos ilimitados"
                          : `Hasta ${plan.maxProducts} productos`}
                      </p>
                      <ul
                        className={`mt-4 flex-1 space-y-1.5 text-sm font-medium ${featured ? "text-violet-50" : "text-slate-600"}`}
                      >
                        {planExtras(plan).map((extra) => (
                          <li
                            key={extra.label}
                            className={`flex gap-2 ${extra.included ? "font-semibold" : featured ? "text-violet-300 line-through" : "text-slate-400 line-through"}`}
                          >
                            <span
                              className={
                                extra.included
                                  ? featured
                                    ? "text-white"
                                    : "text-emerald-600"
                                  : ""
                              }
                            >
                              {extra.included ? "✓" : "—"}
                            </span>
                            <span>{extra.label}</span>
                          </li>
                        ))}
                      </ul>
                      {/* Dos caminos: probar gratis (se registra solo) o contratar ya por WhatsApp. */}
                      <Link
                        href={`/registro?plan=${encodeURIComponent(plan.slug)}`}
                        className={`mt-6 rounded-full py-2.5 text-center text-sm font-bold transition ${
                          featured
                            ? "bg-white text-violet-700 hover:bg-violet-50"
                            : "bg-violet-600 text-white hover:bg-violet-700"
                        }`}
                      >
                        Probar gratis {trialDays} días
                      </Link>
                      <p
                        className={`mt-1.5 text-center text-[11px] font-medium ${featured ? "text-violet-200" : "text-slate-500"}`}
                      >
                        Sin tarjeta · luego {formatPrice(plan.priceMonth)}/mes
                      </p>
                      <a
                        href={`https://wa.me/${salesWhatsapp}?text=${encodeURIComponent(`Hola, quiero contratar el plan ${plan.name} de MiTiendita (${formatPrice(plan.priceMonth)}/mes).`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-3 flex items-center justify-center gap-1.5 rounded-full py-2 text-center text-sm font-bold ring-1 transition ${
                          featured
                            ? "text-white ring-white/40 hover:bg-white/10"
                            : "text-green-700 ring-green-200 hover:bg-green-50"
                        }`}
                      >
                        💬 Contratar ya por WhatsApp
                      </a>
                    </article>
                  );
                })}
              </div>
              {/* Lo que traen todos los planes: una sola vez, debajo de las tarjetas. */}
              <div className="mx-auto mt-8 max-w-5xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <p className="text-center text-sm font-black text-slate-900">
                  Todos los planes incluyen
                </p>
                <ul className="mt-4 grid gap-x-6 gap-y-2.5 text-sm font-medium text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                  {BASE_FEATURES.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-3xl font-black text-violet-700">
                Empieza gratis
              </p>
              <p className="mt-3 text-sm font-medium text-slate-600">
                Crea tu tienda y publica tus productos sin costo. Te contamos
                los planes cuando quieras crecer.
              </p>
              <Link
                href="/registro"
                className="mt-6 inline-block rounded-full bg-violet-600 px-7 py-3 font-bold text-white hover:bg-violet-700"
              >
                Crear mi tienda gratis
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="bg-gray-50 py-14">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Preguntas frecuentes
          </h2>
          <div className="mt-6 grid gap-2.5 md:grid-cols-2">
            {faqsFor(trialDays).map((f) => (
              <div
                key={f.q}
                className="rounded-lg bg-white px-4 py-3 ring-1 ring-black/5"
              >
                <h3 className="text-sm font-bold text-slate-900">{f.q}</h3>
                <p className="mt-1 text-[13px] leading-snug text-gray-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pie */}
      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-3 gap-x-4 gap-y-8 px-5 py-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-3 lg:col-span-1">
            <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <Image
                src="/logo.svg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg"
              />
              <span>
                Mi<span className="text-violet-600">Tiendita</span>
              </span>
            </span>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              Tu tienda online para vender por WhatsApp y cobrar con Yape o
              Plin.
            </p>
          </div>
          {[
            {
              title: "Producto",
              links: [
                ["Crear tienda", "/registro"],
                ["Ingresar", "/panel/login"],
                ["Precios", "#precios"],
              ],
            },
            {
              title: "Legal",
              links: [
                ["Términos", "/terminos"],
                ["Privacidad", "/privacidad"],
              ],
            },
            {
              title: "Ayuda",
              links: [["Documentación de la API", "/api-docs"]],
            },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-violet-700">
                      {label}
                    </Link>
                  </li>
                ))}
                {col.title === "Ayuda" && (
                  <li>
                    <a
                      href={whatsappLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-green-600 hover:text-green-700"
                    >
                      Escríbenos por WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-black/5">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-x-3 gap-y-1 px-5 pb-20 pt-5 text-xs text-slate-400 sm:flex-row sm:pb-6">
            <span>© {new Date().getFullYear()} MiTiendita · Hecho en Perú</span>
            <span className="hidden sm:inline">·</span>
            <span>
              Desarrollado por{" "}
              <a
                href="https://cytios-systems.vercel.app/"
                target="_blank"
                rel="noopener"
                className="font-semibold text-slate-600 hover:text-violet-700"
              >
                Cytios Systems
              </a>
            </span>
          </div>
        </div>
      </footer>

      <WhatsAppFloat />
    </main>
  );
}
