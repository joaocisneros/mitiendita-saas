import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { createMysqlAdapter } from '../src/prisma/prisma-adapter';

/**
 * Tienda de EJEMPLO de Telecomunicaciones (internet hogar + portabilidad).
 * Sirve para probar el flujo "digital": el cliente solicita un plan, deja sus
 * datos y luego puede coordinar por WhatsApp o adelantar el pago por Yape.
 * Idempotente: se puede correr varias veces.
 *
 * Uso:  npm run prisma:seed:telecom
 * Tienda: /tienda/conecta-hogar
 */
const prisma = new PrismaClient({
  adapter: createMysqlAdapter(process.env.DATABASE_URL ?? ''),
});

const SUBDOMAIN = 'conecta-hogar';
const IMG = 'https://images.unsplash.com';
const photo = (id: string, w = 800) => `${IMG}/${id}?w=${w}&q=80&auto=format&fit=crop`;

const STORE = {
  name: 'Conecta Hogar',
  owner: 'Conecta Hogar',
  email: 'hola@conectahogar.example',
  businessType: 'Internet hogar', // -> rubro Telecomunicaciones (plantilla digital)
  description:
    'Internet hogar de fibra óptica y portabilidad al mejor precio. ' +
    'Instalación rápida y soporte por WhatsApp. ¡Contrata hoy!',
  primaryColor: '#dc2626',
  secondaryColor: '#2563eb',
  whatsappNumber: '51921676408',
  yapeNumber: '921676408',
  yapeHolderName: 'Conecta Hogar',
  yapeQrUrl:
    'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=' +
    encodeURIComponent('Yape Conecta Hogar 921676408'),
  storeAddress: 'Av. Principal 456, Lima',
};

const CONTENT: Array<{
  category: string;
  products: Array<{ name: string; price: number; description: string; image: string; featured?: boolean }>;
}> = [
  {
    category: 'Internet Hogar',
    products: [
      {
        name: 'Fibra 100 Mbps',
        price: 69,
        description: '100 Mbps de bajada · Instalación gratis · Router WiFi incluido · Soporte 24/7',
        image: photo('photo-1606904825846-647eb07f5be2'),
      },
      {
        name: 'Fibra 200 Mbps',
        price: 89,
        description: '200 Mbps de bajada · Instalación gratis · Router WiFi 6 incluido · Ideal para teletrabajo',
        image: photo('photo-1558494949-ef010cbdcc31'),
        featured: true,
      },
      {
        name: 'Fibra 400 Mbps',
        price: 119,
        description: '400 Mbps de bajada · Instalación gratis · Router WiFi 6 · Para gaming y streaming 4K',
        image: photo('photo-1542751371-adc38448a05e'),
      },
    ],
  },
  {
    category: 'Portabilidad',
    products: [
      {
        name: 'Portabilidad Plan 30 GB',
        price: 39,
        description: 'Tráete tu número · 30 GB · Llamadas y SMS ilimitados · Redes sociales gratis',
        image: photo('photo-1511707171634-5f897ff02aa9'),
      },
      {
        name: 'Portabilidad Plan 60 GB',
        price: 59,
        description: 'Tráete tu número · 60 GB · Llamadas y SMS ilimitados · Roaming Latam incluido',
        image: photo('photo-1601784551446-20c9e07cdbdb'),
        featured: true,
      },
    ],
  },
  {
    category: 'Recargas y Chips',
    products: [
      {
        name: 'Chip prepago nuevo',
        price: 5,
        description: 'Chip nuevo · Incluye S/ 5 de saldo · Activación inmediata',
        image: photo('photo-1616348436168-de43ad0db179'),
      },
      {
        name: 'Recarga S/ 20',
        price: 20,
        description: 'Recarga rápida · Bono de datos extra · Vigencia 30 días',
        image: photo('photo-1556742502-ec7c0e9f34b1'),
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
      primaryColor: STORE.primaryColor,
      secondaryColor: STORE.secondaryColor,
      whatsappNumber: STORE.whatsappNumber,
      yapeNumber: STORE.yapeNumber,
      yapeHolderName: STORE.yapeHolderName,
      yapeQrUrl: STORE.yapeQrUrl,
      storeAddress: STORE.storeAddress,
      allowsPickup: false,
      allowsDelivery: false,
    },
    create: {
      companyId: company.id,
      storeName: STORE.name,
      businessType: STORE.businessType,
      description: STORE.description,
      primaryColor: STORE.primaryColor,
      secondaryColor: STORE.secondaryColor,
      whatsappNumber: STORE.whatsappNumber,
      yapeNumber: STORE.yapeNumber,
      yapeHolderName: STORE.yapeHolderName,
      yapeQrUrl: STORE.yapeQrUrl,
      storeAddress: STORE.storeAddress,
    },
  });

  const passwordHash = await bcrypt.hash('Telecom12345', 12);
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
        },
      });
      count++;
    }
  }

  console.log(`📡 Tienda telecom lista: ${STORE.name} · /tienda/${SUBDOMAIN} · ${count} planes`);
  console.log(`   Dueño: ${STORE.email} / Telecom12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
