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
  { subdomain: 'demo-trial-ok', name: 'Bodega La Esquina', owner: 'Lucía Ramos', email: 'lucia@demo.test', planSlug: 'basico', status: 'active', subscriptionStatus: 'trial', endsInDays: 9, businessType: 'Bodega' },
  { subdomain: 'demo-trial-sinfecha', name: 'Snacks Don Pepe', owner: 'José Quispe', email: 'jose@demo.test', planSlug: 'basico', status: 'active', subscriptionStatus: 'trial', endsInDays: null, businessType: 'Snacks' },
  { subdomain: 'demo-activa', name: 'Farmacia Salud Total', owner: 'Ana Flores', email: 'ana@demo.test', planSlug: 'pro', status: 'active', subscriptionStatus: 'active', endsInDays: 22, notes: 'Pago al día por transferencia.', businessType: 'Farmacia' },
  { subdomain: 'demo-porvencer', name: 'Moda Urbana', owner: 'Carla Díaz', email: 'carla@demo.test', planSlug: 'pro', status: 'active', subscriptionStatus: 'active', endsInDays: 2, notes: 'Vence pronto, contactar.', businessType: 'Ropa' },
  { subdomain: 'demo-vencida', name: 'Tech Repuestos', owner: 'Mario León', email: 'mario@demo.test', planSlug: 'premium', status: 'active', subscriptionStatus: 'past_due', endsInDays: -6, notes: 'No respondió al primer aviso.', businessType: 'Tecnología' },
  { subdomain: 'demo-suspendida', name: 'Juguetería Pim Pam', owner: 'Rosa Vega', email: 'rosa@demo.test', planSlug: 'basico', status: 'suspended', subscriptionStatus: 'past_due', endsInDays: -20, notes: 'Suspendida por falta de pago.', businessType: 'Juguetería' },
  { subdomain: 'demo-cancelada', name: 'Café del Centro', owner: 'Pedro Sánchez', email: 'pedro@demo.test', planSlug: 'basico', status: 'inactive', subscriptionStatus: 'cancelled', endsInDays: -40, notes: 'Cliente canceló el servicio.', businessType: 'Cafetería' },
];

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
    console.log(`✓ ${d.subdomain} (${d.subscriptionStatus})`);
  }
}

main()
  .then(() => console.log(`🌱 ${DEMOS.length} empresas demo listas (clave: Demo12345)`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
