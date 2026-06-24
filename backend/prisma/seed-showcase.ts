import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { createMysqlAdapter } from '../src/prisma/prisma-adapter';

/**
 * Tienda VITRINA de ejemplo para la landing (apta para producción).
 * Una pizzería profesional, con fotos reales, para mostrar a prospectos
 * cómo se verá su tienda. Idempotente: se puede correr varias veces.
 *
 * Uso:  npm run prisma:seed:showcase
 * Luego: define NEXT_PUBLIC_DEMO_STORE=bella-napoli en el frontend.
 */
const prisma = new PrismaClient({
  adapter: createMysqlAdapter(process.env.DATABASE_URL ?? ''),
});

const SUBDOMAIN = 'bella-napoli';
const IMG = 'https://images.unsplash.com';
const photo = (id: string, w = 800) => `${IMG}/${id}?w=${w}&q=80&auto=format&fit=crop`;

const STORE = {
  name: 'Pizzería Bella Nápoli',
  owner: 'Bella Nápoli',
  email: 'hola@bellanapoli.example',
  businessType: 'Pizzerías',
  description:
    'Pizza artesanal al horno de leña, con masa madre e ingredientes frescos del día. ' +
    'Delivery en 30 minutos o recoge en tienda. ¡Te esperamos!',
  logoUrl: photo('photo-1513104890138-7c749659a591', 400),
  primaryColor: '#e11d48',
  secondaryColor: '#f59e0b',
  whatsappNumber: '51999888777',
  yapeNumber: '999888777',
  yapeHolderName: 'Pizzería Bella Nápoli',
  storeAddress: 'Av. Italia 123, Miraflores, Lima',
  deliveryNotes: 'Delivery gratis en pedidos mayores a S/ 40.',
};

const CONTENT: Array<{
  category: string;
  products: Array<{ name: string; price: number; description: string; image: string; featured?: boolean }>;
}> = [
  {
    category: 'Pizzas',
    products: [
      { name: 'Pizza Margarita', price: 29.9, description: 'Salsa de tomate San Marzano, mozzarella fresca y albahaca.', image: photo('photo-1574071318508-1cdbab80d002'), featured: true },
      { name: 'Pizza Pepperoni', price: 34.9, description: 'Doble pepperoni y abundante queso mozzarella.', image: photo('photo-1628840042765-356cda07504e'), featured: true },
      { name: 'Pizza Cuatro Quesos', price: 36, description: 'Mozzarella, parmesano, gouda y queso azul.', image: photo('photo-1513104890138-7c749659a591') },
      { name: 'Pizza Hawaiana', price: 33, description: 'Jamón, piña y mozzarella.', image: photo('photo-1565299624946-b28f40a0ae38') },
    ],
  },
  {
    category: 'Bebidas',
    products: [
      { name: 'Limonada Frozen 500ml', price: 9, description: 'Limonada natural con hierbabuena, recién hecha.', image: photo('photo-1437418747212-8d9709afab22') },
      { name: 'Gaseosa 1.5L', price: 8, description: 'Inca Kola o Coca-Cola, bien helada.', image: photo('photo-1554866585-cd94860890b7') },
    ],
  },
  {
    category: 'Postres',
    products: [
      { name: 'Tiramisú', price: 14, description: 'Clásico italiano con café y mascarpone.', image: photo('photo-1571877227200-a0d98ea607e9'), featured: true },
      { name: 'Volcán de Chocolate', price: 15, description: 'Bizcocho tibio con centro de chocolate fundido.', image: photo('photo-1606313564200-e75d5e30476c') },
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
  const premium = await prisma.plan.findFirst({ where: { slug: 'premium' }, select: { id: true } });
  const anyPlan = premium ?? (await prisma.plan.findFirst({ select: { id: true } }));
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
      storeAddress: STORE.storeAddress,
      deliveryNotes: STORE.deliveryNotes,
      allowsPickup: true,
      allowsDelivery: true,
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
      storeAddress: STORE.storeAddress,
      deliveryNotes: STORE.deliveryNotes,
    },
  });

  const passwordHash = await bcrypt.hash('Vitrina12345', 12);
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
          stock: 100,
          isFeatured: p.featured ?? false,
        },
      });
      count++;
    }
  }

  console.log(`🍕 Vitrina lista: ${STORE.name} · /tienda/${SUBDOMAIN} · ${count} productos con foto`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
