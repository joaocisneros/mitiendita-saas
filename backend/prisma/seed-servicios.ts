import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { createMysqlAdapter } from '../src/prisma/prisma-adapter';

/**
 * Tienda de EJEMPLO de Servicios (barbería) para probar el flujo de RESERVA
 * con adelanto (opcional y requerido) y pago por Yape/Plin. Idempotente.
 *
 * Uso:  npm run prisma:seed:servicios
 * Tienda: /tienda/estilo-urbano
 */
const prisma = new PrismaClient({
  adapter: createMysqlAdapter(process.env.DATABASE_URL ?? ''),
});

const SUBDOMAIN = 'estilo-urbano';
const IMG = 'https://images.unsplash.com';
const photo = (id: string, w = 800) => `${IMG}/${id}?w=${w}&q=80&auto=format&fit=crop`;

const STORE = {
  name: 'Barbería Estilo Urbano',
  owner: 'Estilo Urbano',
  email: 'hola@estilourbano.example',
  businessType: 'Barberías', // -> rubro Belleza (plantilla servicios / reservas)
  description:
    'Cortes clásicos y modernos, arreglo de barba y color. Reserva tu horario ' +
    'y paga tu adelanto por Yape o Plin. ¡Te esperamos!',
  logoUrl: photo('photo-1503951914875-452162b0f3f1', 400),
  primaryColor: '#0f766e',
  secondaryColor: '#f59e0b',
  whatsappNumber: '51988777666',
  yapeNumber: '988777666',
  yapeHolderName: 'Barbería Estilo Urbano',
  yapeQrUrl:
    'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=' +
    encodeURIComponent('Yape Estilo Urbano 988777666'),
  plinNumber: '988777666',
  plinHolderName: 'Barbería Estilo Urbano',
  plinQrUrl:
    'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=' +
    encodeURIComponent('Plin Estilo Urbano 988777666'),
  storeAddress: 'Av. Los Olivos 789, Lima',
};

type Advance = { mode: 'none' | 'optional' | 'required'; type: 'fixed' | 'percent'; value: number };

const CONTENT: Array<{
  category: string;
  products: Array<{ name: string; price: number; description: string; image: string; featured?: boolean; advance: Advance }>;
}> = [
  {
    category: 'Cortes',
    products: [
      {
        name: 'Corte clásico',
        price: 25,
        description: 'Corte a máquina y tijera · Lavado · Peinado',
        image: photo('photo-1621605815971-fbc98d665033'),
        advance: { mode: 'optional', type: 'percent', value: 30 },
        featured: true,
      },
      {
        name: 'Corte + Barba',
        price: 35,
        description: 'Corte completo · Perfilado de barba · Toalla caliente',
        image: photo('photo-1599351431202-1e0f0137899a'),
        advance: { mode: 'optional', type: 'percent', value: 30 },
      },
    ],
  },
  {
    category: 'Barba',
    products: [
      {
        name: 'Diseño de barba',
        price: 20,
        description: 'Perfilado · Recorte · Aceite hidratante',
        image: photo('photo-1517832606299-7ae9b720a186'),
        advance: { mode: 'none', type: 'percent', value: 0 },
      },
    ],
  },
  {
    category: 'Color',
    products: [
      {
        name: 'Tinte completo',
        price: 60,
        description: 'Coloración profesional · Requiere adelanto para reservar',
        image: photo('photo-1560066984-138dadb4c035'),
        advance: { mode: 'required', type: 'percent', value: 50 },
        featured: true,
      },
    ],
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const anyPlan = await prisma.plan.findFirst({ select: { id: true } });
  if (!anyPlan) throw new Error('No hay planes. Corre primero "npm run prisma:seed".');

  const company = await prisma.company.upsert({
    where: { subdomain: SUBDOMAIN },
    update: {
      name: STORE.name,
      planId: anyPlan.id,
      status: 'active',
      subscriptionStatus: 'active',
      currentPeriodEndsAt: daysFromNow(365),
      deletedAt: null,
    },
    create: {
      name: STORE.name,
      subdomain: SUBDOMAIN,
      planId: anyPlan.id,
      status: 'active',
      subscriptionStatus: 'active',
      currentPeriodEndsAt: daysFromNow(365),
    },
  });

  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: {
      storeName: STORE.name,
      businessType: STORE.businessType,
      description: STORE.description,
      logoUrl: STORE.logoUrl,
      primaryColor: STORE.primaryColor,
      secondaryColor: STORE.secondaryColor,
      whatsappNumber: STORE.whatsappNumber,
      yapeNumber: STORE.yapeNumber,
      yapeHolderName: STORE.yapeHolderName,
      yapeQrUrl: STORE.yapeQrUrl,
      plinNumber: STORE.plinNumber,
      plinHolderName: STORE.plinHolderName,
      plinQrUrl: STORE.plinQrUrl,
      storeAddress: STORE.storeAddress,
    },
    create: {
      companyId: company.id,
      storeName: STORE.name,
      businessType: STORE.businessType,
      description: STORE.description,
      logoUrl: STORE.logoUrl,
      primaryColor: STORE.primaryColor,
      secondaryColor: STORE.secondaryColor,
      whatsappNumber: STORE.whatsappNumber,
      yapeNumber: STORE.yapeNumber,
      yapeHolderName: STORE.yapeHolderName,
      yapeQrUrl: STORE.yapeQrUrl,
      plinNumber: STORE.plinNumber,
      plinHolderName: STORE.plinHolderName,
      plinQrUrl: STORE.plinQrUrl,
      storeAddress: STORE.storeAddress,
    },
  });

  const passwordHash = await bcrypt.hash('Servicios12345', 12);
  const user = await prisma.user.upsert({
    where: { email: STORE.email },
    update: { name: STORE.owner, isActive: true },
    create: { name: STORE.owner, email: STORE.email, passwordHash },
  });
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, companyId: company.id },
  });
  if (!membership) {
    await prisma.membership.create({
      data: { userId: user.id, companyId: company.id, role: 'OWNER' },
    });
  }

  let sort = 0;
  let count = 0;
  for (const block of CONTENT) {
    const catSlug = slugify(block.category);
    const category = await prisma.category.upsert({
      where: { companyId_slug: { companyId: company.id, slug: catSlug } },
      update: { name: block.category, isActive: true, sortOrder: sort++ },
      create: { companyId: company.id, name: block.category, slug: catSlug, sortOrder: sort },
    });
    for (const p of block.products) {
      const slug = slugify(p.name);
      await prisma.product.upsert({
        where: { companyId_slug: { companyId: company.id, slug } },
        update: {
          name: p.name,
          description: p.description,
          price: p.price,
          imageUrl: p.image,
          isFeatured: p.featured ?? false,
          isActive: true,
          categoryId: category.id,
          reservationPaymentMode: p.advance.mode,
          reservationAdvanceType: p.advance.type,
          reservationAdvanceValue: p.advance.value,
          deletedAt: null,
        },
        create: {
          companyId: company.id,
          categoryId: category.id,
          name: p.name,
          slug,
          description: p.description,
          price: p.price,
          imageUrl: p.image,
          stock: 999,
          isFeatured: p.featured ?? false,
          reservationPaymentMode: p.advance.mode,
          reservationAdvanceType: p.advance.type,
          reservationAdvanceValue: p.advance.value,
        },
      });
      count++;
    }
  }

  console.log(`💈 Barbería lista: ${STORE.name} · /tienda/${SUBDOMAIN} · ${count} servicios`);
  console.log(`   Dueño: ${STORE.email} / Servicios12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
