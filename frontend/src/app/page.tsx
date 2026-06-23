import Link from "next/link";

const DEMO = process.env.NEXT_PUBLIC_DEMO_STORE ?? "bodega-don-juan";

const features = [
  { icon: "🛍️", title: "Catálogo en minutos", text: "Sube tus productos y comparte tu tienda al instante." },
  { icon: "📱", title: "Vende por WhatsApp", text: "Tus pedidos llegan ordenados, sin perder ninguno." },
  { icon: "💜", title: "Cobra con Yape", text: "Muestra tu QR y confirma los pagos fácilmente." },
  { icon: "🚚", title: "Delivery o recojo", text: "Tú decides cómo entregar a tus clientes." },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Encabezado */}
      <header className="border-b border-black/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="text-xl font-extrabold tracking-tight">
            Mi<span className="text-violet-600">Tiendita</span>
          </span>
          <Link
            href="/registro"
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Crear mi tienda
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 py-16 text-center sm:py-24">
        <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
          Hecho para negocios del Perú 🇵🇪
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Tu tienda online,{" "}
          <span className="text-violet-600">lista en minutos</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-gray-600">
          Deja el desorden de WhatsApp. Publica tus productos, recibe pedidos y
          cobra con Yape, todo desde tu celular.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/registro"
            className="w-full rounded-full bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 sm:w-auto"
          >
            Crear mi tienda gratis
          </Link>
          <Link href={`/tienda/${DEMO}`} className="text-sm font-bold text-violet-700 hover:underline">Ver tienda de ejemplo →</Link>
        </div>
      </section>

      {/* Beneficios */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-5 sm:grid-cols-2 lg:grid-cols-4">
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
      </section>

      <footer className="border-t border-black/5 py-8 text-center text-sm text-gray-400">
        MiTiendita — SaaS multitienda para PYMES · {new Date().getFullYear()}
      </footer>
    </main>
  );
}
