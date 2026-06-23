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
└── frontend/   Web (Next.js + Tailwind)             ← la "cara"
```

## 🧱 Stack

- **Backend:** NestJS 11, TypeScript, Prisma 7 (driver adapter MariaDB), MySQL 8, JWT.
- **Frontend:** Next.js 16 + React 19 + Tailwind 4 (mobile-first).
- **Imágenes:** Cloudinary mediante un servicio de medios centralizado.

---

## 🔌 Puertos reservados para MiTiendita

Bloque dedicado para no chocar con otros proyectos de Laragon
(MiPlanilla 8000/8004/8123, FACTURACIONELECTRONICA 8090/8766/8767, IA 3001/5175, etc.):

| Servicio | Puerto |
|---|---|
| Backend API | **8300** |
| Frontend | **8301** |

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
# Crear una sola vez la base mitiendita_test y aplicar sus migraciones.
DATABASE_URL=mysql://root:@localhost:3306/mitiendita_test npx prisma migrate deploy
npm run test:e2e
```

Las pruebas usan `mitiendita_test`; nunca deben ejecutarse contra `mitiendita_db`.

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
- Registro de negocio: `http://localhost:8301/registro`
- Tienda: `http://localhost:8301/tienda/<subdominio>`
- Panel del dueño: `http://localhost:8301/panel/login`
- Superadmin: `http://localhost:8301/superadmin/login`
- Empresas: `http://localhost:8301/superadmin/empresas`
- Planes: `http://localhost:8301/superadmin/planes`
- Auditoría: `http://localhost:8301/superadmin/actividad`
- API: `http://localhost:8300/api`

37 pruebas e2e cubren auth, aislamiento multi-tenant, catálogo, clientes,
pedidos, anti-sobreventa, idempotencia, pagos y superadmin.

El panel del negocio incluye dashboard, productos, categorías, clientes,
pedidos y configuración. La tienda pública incluye buscador, detalle de
producto, carrito, checkout invitado, Yape, comprobante y WhatsApp.
