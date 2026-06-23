import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import {
  PrismaClient,
  type SubscriptionStatus,
  type CompanyStatus,
} from '../generated/prisma/client';
import { createMysqlAdapter } from '../src/prisma/prisma-adapter';

const prisma = new PrismaClient({
  adapter: createMysqlAdapter(process.env.DATABASE_URL ?? ''),
});

const daysFromNow = (days: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

// Empresas de demostración cubriendo todos los estados de suscripción.
const DEMOS: Array<{
  subdomain: string;
  name: string;
  owner: string;
  email: string;
  planSlug: string;
  status: CompanyStatus;
  subscriptionStatus: SubscriptionStatus;
  endsInDays: number | null;
  notes?: string;
  businessType: string;
}> = [
  { subdomain: 'demo-catalogo', name: 'Bodega La Esquina', owner: 'Lucía Ramos', email: 'lucia@demo.test', planSlug: 'basico', status: 'active', subscriptionStatus: 'trial', endsInDays: 9, businessType: 'Bodegas' },
  { subdomain: 'demo-carta', name: 'Pizzería Don Pepe', owner: 'José Quispe', email: 'jose@demo.test', planSlug: 'basico', status: 'active', subscriptionStatus: 'trial', endsInDays: null, businessType: 'Pizzerías' },
  { subdomain: 'demo-servicios', name: 'Salón Bella Vista', owner: 'Ana Flores', email: 'ana@demo.test', planSlug: 'pro', status: 'active', subscriptionStatus: 'active', endsInDays: 22, notes: 'Pago al día por transferencia.', businessType: 'Salones de belleza' },
  { subdomain: 'demo-digital', name: 'StreamPro', owner: 'Carla Díaz', email: 'carla@demo.test', planSlug: 'pro', status: 'active', subscriptionStatus: 'active', endsInDays: 2, notes: 'Vence pronto, contactar.', businessType: 'Streaming' },
  { subdomain: 'demo-taller', name: 'Taller Mecánico León', owner: 'Mario León', email: 'mario@demo.test', planSlug: 'premium', status: 'active', subscriptionStatus: 'past_due', endsInDays: -6, notes: 'No respondió al primer aviso.', businessType: 'Talleres mecánicos' },
  { subdomain: 'demo-suspendida', name: 'Juguetería Pim Pam', owner: 'Rosa Vega', email: 'rosa@demo.test', planSlug: 'basico', status: 'suspended', subscriptionStatus: 'past_due', endsInDays: -20, notes: 'Suspendida por falta de pago.', businessType: 'Tiendas de mascotas' },
  { subdomain: 'demo-cancelada', name: 'Café del Centro', owner: 'Pedro Sánchez', email: 'pedro@demo.test', planSlug: 'basico', status: 'inactive', subscriptionStatus: 'cancelled', endsInDays: -40, notes: 'Cliente canceló el servicio.', businessType: 'Cafeterías' },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface DemoProduct {
  name: string;
  price: number;
  description?: string;
  featured?: boolean;
}

// Contenido demo por tienda: categorías y sus productos.
const STORE_CONTENT: Record<
  string,
  Array<{ category: string; products: DemoProduct[] }>
> = {
  'demo-catalogo': [
    {
      category: 'Abarrotes',
      products: [
        { name: 'Arroz Costeño 5kg', price: 24.9, description: 'Arroz extra, saco de 5 kilos.', featured: true },
        { name: 'Aceite Primor 1L', price: 9.5, description: 'Aceite vegetal de 1 litro.' },
        { name: 'Leche Gloria x6', price: 22, description: 'Pack de 6 tarros de leche evaporada.' },
        { name: 'Azúcar rubia 1kg', price: 4.2 },
      ],
    },
    {
      category: 'Bebidas',
      products: [
        { name: 'Inca Kola 1.5L', price: 7.5, description: 'Gaseosa 1.5 litros.', featured: true },
        { name: 'Agua San Luis 625ml', price: 1.5 },
      ],
    },
  ],
  'demo-carta': [
    {
      category: 'Pizzas',
      products: [
        { name: 'Pizza Margarita', price: 29.9, description: 'Salsa de tomate, mozzarella y albahaca fresca.', featured: true },
        { name: 'Pizza Pepperoni', price: 34.9, description: 'Doble pepperoni y queso mozzarella.', featured: true },
        { name: 'Pizza Hawaiana', price: 33, description: 'Jamón, piña y mozzarella.' },
        { name: 'Pizza Cuatro Quesos', price: 36, description: 'Mozzarella, parmesano, gouda y queso azul.' },
      ],
    },
    {
      category: 'Bebidas',
      products: [
        { name: 'Gaseosa 1.5L', price: 8 },
        { name: 'Jugo de naranja', price: 9, description: 'Vaso 500ml, recién exprimido.' },
      ],
    },
  ],
  'demo-servicios': [
    {
      category: 'Servicios',
      products: [
        { name: 'Corte de cabello', price: 25, description: 'Corte y peinado para dama o caballero.' },
        { name: 'Tinte completo', price: 80, description: 'Coloración profesional, incluye lavado.', featured: true },
        { name: 'Manicure + Pedicure', price: 45, description: 'Cuidado completo de manos y pies.' },
        { name: 'Peinado para eventos', price: 60, description: 'Recogidos y ondas para ocasiones especiales.' },
      ],
    },
  ],
  'demo-digital': [
    {
      category: 'Planes',
      products: [
        { name: 'Plan Básico', price: 15, description: '1 pantalla\nCalidad HD\nCatálogo completo' },
        { name: 'Plan Estándar', price: 25, description: '2 pantallas\nCalidad Full HD\nDescargas offline', featured: true },
        { name: 'Plan Premium', price: 35, description: '4 pantallas\nCalidad 4K + HDR\nDescargas ilimitadas\nSin anuncios' },
      ],
    },
  ],
  'demo-taller': [
    {
      category: 'Servicios',
      products: [
        { name: 'Cambio de aceite', price: 90, description: 'Aceite sintético + filtro incluido.' },
        { name: 'Alineación y balanceo', price: 70, description: 'Las 4 ruedas.', featured: true },
        { name: 'Revisión general', price: 120, description: 'Diagnóstico de 30 puntos.' },
      ],
    },
  ],
};

async function main() {
  const passwordHash = await bcrypt.hash('Demo12345', 12);
  const plans = await prisma.plan.findMany({ select: { id: true, slug: true } });
  const planBySlug = new Map(plans.map((p) => [p.slug, p.id]));
  if (planBySlug.size === 0) {
    throw new Error('No hay planes. Corre primero "npm run prisma:seed".');
  }

  for (const d of DEMOS) {
    const planId = planBySlug.get(d.planSlug) ?? null;
    const currentPeriodEndsAt =
      d.endsInDays === null ? null : daysFromNow(d.endsInDays);

    const company = await prisma.company.upsert({
      where: { subdomain: d.subdomain },
      update: {
        name: d.name,
        planId,
        status: d.status,
        subscriptionStatus: d.subscriptionStatus,
        currentPeriodEndsAt,
        subscriptionNotes: d.notes ?? null,
        deletedAt: null,
      },
      create: {
        name: d.name,
        subdomain: d.subdomain,
        planId,
        status: d.status,
        subscriptionStatus: d.subscriptionStatus,
        currentPeriodEndsAt,
        subscriptionNotes: d.notes ?? null,
      },
    });

    await prisma.companySettings.upsert({
      where: { companyId: company.id },
      update: { storeName: d.name, businessType: d.businessType },
      create: {
        companyId: company.id,
        storeName: d.name,
        businessType: d.businessType,
        whatsappNumber: '51999000111',
      },
    });

    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: { name: d.owner, isActive: d.status !== 'inactive' },
      create: { name: d.owner, email: d.email, passwordHash },
    });

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, companyId: company.id },
    });
    if (!membership) {
      await prisma.membership.create({
        data: { userId: user.id, companyId: company.id, role: 'OWNER' },
      });
    }

    // Contenido demo (categorías + productos) idempotente.
    const content = STORE_CONTENT[d.subdomain] ?? [];
    let sort = 0;
    for (const block of content) {
      const catSlug = slugify(block.category);
      const category = await prisma.category.upsert({
        where: { companyId_slug: { companyId: company.id, slug: catSlug } },
        update: { name: block.category, isActive: true, sortOrder: sort++ },
        create: {
          companyId: company.id,
          name: block.category,
          slug: catSlug,
          sortOrder: sort,
        },
      });
      for (const p of block.products) {
        const slug = slugify(p.name);
        await prisma.product.upsert({
          where: { companyId_slug: { companyId: company.id, slug } },
          update: {
            name: p.name,
            description: p.description ?? null,
            price: p.price,
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
            description: p.description ?? null,
            price: p.price,
            stock: 100,
            isFeatured: p.featured ?? false,
          },
        });
      }
    }
    const count = content.reduce((n, b) => n + b.products.length, 0);
    console.log(`✓ ${d.subdomain} (${d.subscriptionStatus})${count ? ` · ${count} productos` : ''}`);
  }
}

main()
  .then(() => console.log(`🌱 ${DEMOS.length} empresas demo listas (clave: Demo12345)`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
