# 🛍️ MiTiendita

Plataforma **SaaS multitienda** para PYMES de Latinoamérica (empezando por Perú).
Cada negocio crea su tienda online en minutos, gestiona productos y pedidos, cobra
por **Yape** y coordina por **WhatsApp**. Mobile-first.

> Modelo: `negocio.mitiendita.com` → cada empresa tiene su propio subdominio.

---

## 📁 Estructura del monorepo

```
MiTiendita/
├── backend/    API REST (NestJS + Prisma + MySQL)   ← el "cerebro"
└── frontend/   Web (Next.js + Tailwind)  [Fase 3]   ← la "cara"
```

## 🧱 Stack

- **Backend:** NestJS 11, TypeScript, Prisma 7 (driver adapter MariaDB), MySQL 8, JWT.
- **Frontend:** Next.js + React + Tailwind (mobile-first). *(pendiente, Fase 3)*
- **Imágenes:** Cloudinary. *(pendiente, Fase 2)*

---

## ▶️ Cómo correr el backend (desarrollo)

Requisitos: Node 20+, MySQL (Laragon).

```bash
cd backend
npm install
cp .env.example .env        # ajusta credenciales si hace falta
npx prisma migrate dev      # crea las tablas
npm run prisma:seed         # planes, subdominios reservados, superadmin
npm run start:dev           # API en http://localhost:3001/api
```

Pruebas:

```bash
npm run test:e2e
```

---

## 🗺️ Fases

- **Fase 0 — Cimientos** ✅ multi-tenancy, autenticación (JWT + refresh), registro de empresa.
- **Fase 1** — Registro + configuración de tienda.
- **Fase 2** — Productos y categorías (+ Cloudinary).
- **Fase 3** — Tienda pública + carrito (frontend).
- **Fase 4** — Checkout, pedidos y reserva de stock.
- **Fase 5** — Yape, comprobantes, WhatsApp, notificación al dueño.
- **Fase 6** — Panel de pedidos y pagos.
- **Fase 7** — Superadmin y planes.
