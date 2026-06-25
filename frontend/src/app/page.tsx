import Link from "next/link";
import { getPublicPlans } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { BUSINESS_CATEGORIES } from "@/lib/business-categories";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { whatsappLink } from "@/lib/contact";

// Tienda de ejemplo para la landing. Solo se muestra el botón si está definida,
// así en producción no queda un enlace roto si no quieres mostrar ninguna.
const DEMO = process.env.NEXT_PUBLIC_DEMO_STORE ?? "";

const features = [
  { icon: "🛍️", title: "Catálogo en minutos", text: "Sube tus productos o servicios y comparte tu tienda al instante." },
  { icon: "📱", title: "Vende por WhatsApp", text: "Tus pedidos llegan ordenados a tu chat, sin perder ninguno." },
  { icon: "💜", title: "Cobra con Yape", text: "Muestra tu QR y confirma los pagos con el comprobante del cliente." },
  { icon: "🚚", title: "Delivery o recojo", text: "Tú decides cómo entregar; el cliente elige al hacer el pedido." },
  { icon: "📅", title: "Reservas y citas", text: "Ideal para barberías, spas y consultorios: agenda sin enredos." },
  { icon: "🔁", title: "Suscripciones", text: "Cobra mensualidades y controla los vencimientos automáticamente." },
  { icon: "📦", title: "Control de inventario", text: "Stock al día, alertas de bajo inventario y reportes de ventas." },
  { icon: "📊", title: "Reportes claros", text: "Mira cuánto vendes, tus mejores productos y tu crecimiento." },
];

const steps = [
  { n: "1", title: "Crea tu cuenta", text: "Regístrate gratis y elige el rubro de tu negocio." },
  { n: "2", title: "Sube tus productos", text: "Agrega fotos, precios y tu QR de Yape. Listo en minutos." },
  { n: "3", title: "Comparte y vende", text: "Manda el link de tu tienda y recibe pedidos por WhatsApp." },
];

const faqs = [
  { q: "¿Necesito conocimientos técnicos?", a: "No. Si sabes usar WhatsApp, sabes usar MiTiendita. Todo se maneja desde tu celular." },
  { q: "¿Sirve para mi tipo de negocio?", a: "Sí. Funciona para bodegas, restaurantes, barberías, academias, servicios digitales y mucho más." },
  { q: "¿Cómo cobro a mis clientes?", a: "Muestras tu QR de Yape o Plin. El cliente paga y sube su comprobante; tú lo confirmas desde tu panel." },
  { q: "¿Puedo probar antes de pagar?", a: "Claro. Puedes crear tu tienda y empezar a publicar sin costo. Pasas a un plan pagado cuando lo necesites." },
];

export default async function Home() {
  const plans = await getPublicPlans();

  return (
    <main className="flex-1">
      {/* Encabezado */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <span className="text-xl font-extrabold tracking-tight">
            Mi<span className="text-violet-600">Tiendita</span>
          </span>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/panel/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-block">
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
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:py-24">
          <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            Hecho para negocios del Perú 🇵🇪
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Tu tienda online,{" "}
            <span className="text-violet-600">lista en minutos</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-gray-600">
            Deja el desorden de WhatsApp. Publica tus productos, recibe pedidos
            ordenados y cobra con Yape, todo desde tu celular.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="w-full rounded-full bg-violet-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 sm:w-auto"
            >
              Crear mi tienda gratis
            </Link>
            {DEMO && (
              <Link href={`/tienda/${DEMO}`} className="w-full rounded-full bg-white px-7 py-3.5 font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50 sm:w-auto">
                Ver tienda de ejemplo →
              </Link>
            )}
          </div>
          <p className="mt-5 text-sm font-medium text-slate-500">
            Sin tarjeta de crédito · Listo para vender hoy mismo
          </p>
        </div>
      </section>

      {/* Rubros / categorías */}
      <section className="border-y border-black/5 bg-white py-14">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Para todo tipo de negocio
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
            Cada rubro tiene su propia tienda, con las funciones que realmente necesita.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BUSINESS_CATEGORIES.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-black/5"
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-sm font-bold text-slate-800">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Empieza en 3 pasos
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-lg font-black text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{s.text}</p>
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
          <div className="mt-10 grid grid-cols-1 gap-6 px-0 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
              >
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{f.text}</p>
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
            Empieza gratis y crece cuando lo necesites. Sin contratos ni sorpresas.
          </p>

          {plans.length > 0 ? (
            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, i) => {
                const featured = plans.length >= 3 ? i === 1 : i === 0;
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
                    <h3 className={`text-lg font-black ${featured ? "text-white" : "text-slate-900"}`}>
                      {plan.name}
                    </h3>
                    <p className="mt-4 text-3xl font-black">
                      {formatPrice(plan.priceMonth)}
                      <span className={`text-sm font-semibold ${featured ? "text-violet-200" : "text-slate-500"}`}>
                        {" "}/ mes
                      </span>
                    </p>
                    <p className={`mt-3 text-sm font-medium ${featured ? "text-violet-100" : "text-slate-600"}`}>
                      {plan.maxProducts == null
                        ? "✓ Productos ilimitados"
                        : `✓ Hasta ${plan.maxProducts} productos`}
                    </p>
                    <p className={`mt-1 text-sm font-medium ${featured ? "text-violet-100" : "text-slate-600"}`}>
                      ✓ Pedidos por WhatsApp
                    </p>
                    <p className={`mt-1 text-sm font-medium ${featured ? "text-violet-100" : "text-slate-600"}`}>
                      ✓ Pagos con Yape
                    </p>
                    <Link
                      href="/registro"
                      className={`mt-6 rounded-full py-2.5 text-center text-sm font-bold transition ${
                        featured
                          ? "bg-white text-violet-700 hover:bg-violet-50"
                          : "bg-violet-600 text-white hover:bg-violet-700"
                      }`}
                    >
                      Empezar
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-3xl font-black text-violet-700">Empieza gratis</p>
              <p className="mt-3 text-sm font-medium text-slate-600">
                Crea tu tienda y publica tus productos sin costo. Te contamos los
                planes cuando quieras crecer.
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
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Preguntas frecuentes
          </h2>
          <div className="mt-8 space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-slate-800">
                  {f.q}
                  <span className="text-violet-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-5">
          <div className="rounded-3xl bg-violet-600 px-6 py-14 text-center text-white shadow-xl shadow-violet-600/20">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              ¿Listo para vender más?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-violet-100">
              Crea tu tienda hoy y empieza a recibir pedidos por WhatsApp esta misma semana.
            </p>
            <Link
              href="/registro"
              className="mt-7 inline-block rounded-full bg-white px-8 py-3.5 font-bold text-violet-700 transition hover:bg-violet-50"
            >
              Crear mi tienda gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Pie */}
      <footer className="border-t border-black/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <span className="text-lg font-extrabold tracking-tight">
            Mi<span className="text-violet-600">Tiendita</span>
          </span>
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link href="/registro" className="hover:text-violet-700">Crear tienda</Link>
            <Link href="/panel/login" className="hover:text-violet-700">Ingresar</Link>
            <Link href="#precios" className="hover:text-violet-700">Precios</Link>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="font-bold text-green-600 hover:text-green-700">
              WhatsApp
            </a>
          </nav>
          <span className="text-sm text-gray-400">
            © {new Date().getFullYear()} MiTiendita · Perú
          </span>
        </div>
      </footer>

      <WhatsAppFloat />
    </main>
  );
}
