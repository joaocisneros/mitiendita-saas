import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { createMysqlAdapter } from '../src/prisma/prisma-adapter';

/**
 * Tienda de EJEMPLO de Moda y Accesorios (ropa, zapatillas, joyas, perfumes)
 * para mostrar TALLAS y COLORES por producto + carrito + Yape/Plin. Idempotente.
 *
 * Uso:  npm run prisma:seed:moda
 * Tienda: /tienda/urban-style
 */
const prisma = new PrismaClient({
  adapter: createMysqlAdapter(process.env.DATABASE_URL ?? ''),
});

const SUBDOMAIN = 'urban-style';
const IMG = 'https://images.unsplash.com';
const photo = (id: string, w = 800) => `${IMG}/${id}?w=${w}&q=80&auto=format&fit=crop`;

const STORE = {
  name: 'Urban Style',
  owner: 'Urban Style',
  email: 'hola@urbanstyle.example',
  businessType: 'Moda y accesorios', // -> comercio (catálogo con carrito)
  description:
    'Ropa, zapatillas, joyas y perfumes con estilo. Elige tu talla y color, ' +
    'paga por Yape o Plin y recíbelo rápido.',
  logoUrl: photo('photo-1441984904996-e0b6ba687e04', 400),
  primaryColor: '#0f172a',
  secondaryColor: '#f59e0b',
  whatsappNumber: '51955444333',
  yapeNumber: '955444333',
  yapeHolderName: 'Urban Style',
  yapeQrUrl:
    'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=' +
    encodeURIComponent('Yape Urban Style 955444333'),
  plinNumber: '955444333',
  plinHolderName: 'Urban Style',
  plinQrUrl:
    'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=' +
    encodeURIComponent('Plin Urban Style 955444333'),
  storeAddress: 'C.C. Real Plaza, Tienda 214, Lima',
  hours: 'Lun-Sáb 10am-9pm · Dom 11am-7pm',
  instagramUrl: 'https://instagram.com/urbanstyle',
  facebookUrl: 'https://facebook.com/urbanstyle',
  tiktokUrl: 'https://tiktok.com/@urbanstyle',
};

const CONTENT: Array<{
  category: string;
  products: Array<{ name: string; price: number; description: string; image: string; featured?: boolean; sizes?: string; colors?: string }>;
}> = [
  {
    category: 'Ropa',
    products: [
      {
        name: 'Camiseta Oversize',
        price: 79.9,
        description: 'Algodón premium, corte holgado.',
        image: photo('photo-1521572163474-6864f9cf17ab'),
        sizes: 'S, M, L, XL',
        colors: 'Negro, Blanco, Beige, Azul',
        featured: true,
      },
      {
        name: 'Chaqueta Denim',
        price: 159.9,
        description: 'Mezclilla resistente, estilo clásico.',
        image: photo('photo-1551028719-00167b16eac5'),
        sizes: 'S, M, L, XL',
        colors: 'Azul, Negro',
      },
      {
        name: 'Pantalón Cargo',
        price: 129.9,
        description: 'Cómodo, con bolsillos laterales.',
        image: photo('photo-1517445312882-bc9910d016b7'),
        sizes: '28, 30, 32, 34, 36',
        colors: 'Verde, Negro, Beige',
      },
    ],
  },
  {
    category: 'Zapatillas',
    products: [
      {
        name: 'Zapatillas Urbanas',
        price: 199.9,
        description: 'Suela cómoda, diseño moderno.',
        image: photo('photo-1542291026-7eec264c27ff'),
        sizes: '38, 39, 40, 41, 42, 43',
        colors: 'Blanco, Negro',
        featured: true,
      },
    ],
  },
  {
    category: 'Joyas',
    products: [
      {
        name: 'Anillo de Oro 18K',
        price: 899,
        description: 'Oro 18K, garantía de por vida.',
        image: photo('photo-1605100804763-247f67b3557e'),
        sizes: '6, 7, 8, 9',
      },
      {
        name: 'Collar Corazón',
        price: 459,
        description: 'Piedras naturales certificadas.',
        image: photo('photo-1599643478518-a784e5dc4c8f'),
      },
    ],
  },
  {
    category: 'Perfumes',
    products: [
      {
        name: 'Perfume Floral',
        price: 129.9,
        description: 'Fragancia duradera, notas florales.',
        image: photo('photo-1541643600914-78b084683601'),
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
      hours: STORE.hours,
      instagramUrl: STORE.instagramUrl,
      facebookUrl: STORE.facebookUrl,
      tiktokUrl: STORE.tiktokUrl,
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
      yapeQrUrl: STORE.yapeQrUrl,
      plinNumber: STORE.plinNumber,
      plinHolderName: STORE.plinHolderName,
      plinQrUrl: STORE.plinQrUrl,
      storeAddress: STORE.storeAddress,
      hours: STORE.hours,
      instagramUrl: STORE.instagramUrl,
      facebookUrl: STORE.facebookUrl,
      tiktokUrl: STORE.tiktokUrl,
    },
  });

  const passwordHash = await bcrypt.hash('Moda12345', 12);
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
          sizes: p.sizes ?? null,
          colors: p.colors ?? null,
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
          sizes: p.sizes ?? null,
          colors: p.colors ?? null,
          stock: 100,
          isFeatured: p.featured ?? false,
        },
      });
      count++;
    }
  }

  console.log(`👕 Tienda de moda lista: ${STORE.name} · /tienda/${SUBDOMAIN} · ${count} productos con tallas/colores`);
  console.log(`   Dueño: ${STORE.email} / Moda12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
