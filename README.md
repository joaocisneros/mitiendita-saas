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

## 🔌 Puertos reservados para MiTiendita

Bloque dedicado para no chocar con otros proyectos de Laragon
(MiPlanilla 8000/8004/8123, FACTURACIONELECTRONICA 8090/8766/8767, IA 3001/5175, etc.):

| Servicio | Puerto |
|---|---|
| Backend API | **8300** |
| Frontend | **8301** *(Fase 3)* |

## ▶️ Cómo correr el backend (desarrollo)

Requisitos: Node 20+, MySQL (Laragon).

```bash
cd backend
npm install
cp .env.example .env        # ajusta credenciales si hace falta
npx prisma migrate dev      # crea las tablas
npm run prisma:seed         # planes, subdominios reservados, superadmin
npm run start:dev           # API en http://localhost:8300/api
```

Pruebas:

```bash
npm run test:e2e
```

---

## 🗺️ Fases (MVP completo ✅)

- **Fase 0 — Cimientos** ✅ multi-tenancy, autenticación (JWT + refresh), registro de empresa.
- **Fase 1 — Configuración de tienda** ✅ marca, colores, Yape, WhatsApp, delivery.
- **Fase 2 — Catálogo** ✅ productos y categorías (CRUD + Cloudinary).
- **Fase 3 — Tienda pública** ✅ catálogo + carrito mobile-first.
- **Fase 4 — Checkout** ✅ pedidos, recálculo en servidor, reserva de stock, idempotencia.
- **Fase 5 — Pago** ✅ Yape (QR), comprobante, WhatsApp.
- **Fase 6 — Panel del dueño** ✅ dashboard, pedidos, aprobar/rechazar pago, estados, expiración.
- **Fase 7 — Superadmin** ✅ empresas, suspender/activar, planes, métricas globales.

### URLs (desarrollo)
- Tienda: `http://localhost:8301/tienda/<subdominio>`
- Panel del dueño: `http://localhost:8301/panel/login`
- Superadmin: `http://localhost:8301/superadmin/login`
- API: `http://localhost:8300/api`

35 pruebas e2e cubren auth, aislamiento multi-tenant, catálogo, pedidos,
anti-sobreventa, idempotencia, pagos y superadmin.
