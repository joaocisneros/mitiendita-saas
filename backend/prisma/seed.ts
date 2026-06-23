import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { createMysqlAdapter } from '../src/prisma/prisma-adapter';

const prisma = new PrismaClient({
  adapter: createMysqlAdapter(process.env.DATABASE_URL ?? ''),
});

// Planes comerciales del MVP (precios y límites de productos).
const PLANS = [
  { slug: 'basico', name: 'Básico', priceMonth: 39, maxProducts: 50 },
  { slug: 'pro', name: 'Pro', priceMonth: 89, maxProducts: 300 },
  { slug: 'premium', name: 'Premium', priceMonth: 149, maxProducts: null },
];

// Subdominios que ninguna empresa puede tomar.
const RESERVED = [
  'www',
  'api',
  'admin',
  'app',
  'panel',
  'soporte',
  'status',
  'mail',
  'store',
  'tienda',
  'blog',
  'ftp',
  'cdn',
  'assets',
  'static',
  'dashboard',
  'login',
  'signup',
  'help',
  'ayuda',
  'pay',
  'pagos',
];

async function main() {
  // ── Planes ──
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        priceMonth: p.priceMonth,
        maxProducts: p.maxProducts,
      },
      create: p,
    });
  }
  console.log(`✓ ${PLANS.length} planes`);

  // ── Subdominios reservados ──
  for (const slug of RESERVED) {
    await prisma.reservedSubdomain.upsert({
      where: { slug },
      update: {},
      create: { slug },
    });
  }
  console.log(`✓ ${RESERVED.length} subdominios reservados`);

  // ── Superadministrador ──
  const email = process.env.SUPERADMIN_EMAIL ?? 'admin@mitiendita.localhost';
  const password = process.env.SUPERADMIN_PASSWORD ?? 'Admin12345';
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.superAdmin.upsert({
    where: { email },
    update: {},
    create: { name: 'Super Administrador', email, passwordHash },
  });
  console.log(`✓ Superadmin inicial configurado: ${email}`);
}

main()
  .then(() => console.log('🌱 Seed completado'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
