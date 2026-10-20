import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Lo que incluye cada plan: fotos por producto y funciones bloqueadas.
 * Cambiar el plan de la empresa (o lo que incluye un plan) se aplica al instante.
 */
describe('Límites por plan (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tag = Date.now();
  let token = '';
  let companyId = '';
  let basicoId = 0;
  let proId = 0;
  const original: Array<{
    id: number;
    maxImages: number;
    featExcel: boolean;
    featCredits: boolean;
  }> = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const plans = await prisma.plan.findMany({
      where: { slug: { in: ['basico', 'pro'] } },
    });
    for (const plan of plans) {
      original.push({
        id: plan.id,
        maxImages: plan.maxImages,
        featExcel: plan.featExcel,
        featCredits: plan.featCredits,
      });
      if (plan.slug === 'basico') basicoId = plan.id;
      if (plan.slug === 'pro') proId = plan.id;
    }
    await prisma.plan.update({
      where: { id: basicoId },
      data: { maxImages: 6, featExcel: false, featCredits: false },
    });
    await prisma.plan.update({
      where: { id: proId },
      data: { maxImages: 12, featExcel: true, featCredits: true },
    });

    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        responsibleName: 'Dueña Planes',
        email: `planes_${tag}@test.com`,
        password: 'clave12345',
        commercialName: 'Tienda Planes',
        subdomain: `planes-${tag}`,
        whatsappNumber: '+51900000000',
      })
      .expect(201);
    token = res.body.accessToken as string;
    companyId = res.body.company.id as string;
  });

  afterAll(async () => {
    // Deja los planes como estaban para no afectar a otras pruebas.
    for (const plan of original) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: {
          maxImages: plan.maxImages,
          featExcel: plan.featExcel,
          featCredits: plan.featCredits,
        },
      });
    }
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const photos = (n: number) =>
    Array.from({ length: n }, (_, i) => `https://img.test/${tag}-${i}.jpg`);
  const setPlan = (planId: number) =>
    prisma.company.update({ where: { id: companyId }, data: { planId } });

  it('el panel recibe lo que incluye su plan', async () => {
    const res = await http()
      .get('/api/admin/settings/plan')
      .set(auth())
      .expect(200);
    expect(res.body.limits).toMatchObject({
      maxImages: 6,
      excel: false,
      credits: false,
    });
  });

  it('Básico permite 6 fotos y rechaza 7', async () => {
    await http()
      .post('/api/products')
      .set(auth())
      .send({ name: 'Polo Seis', price: 30, stock: 2, images: photos(6) })
      .expect(201);
    const res = await http()
      .post('/api/products')
      .set(auth())
      .send({ name: 'Polo Siete', price: 30, stock: 2, images: photos(7) })
      .expect(400);
    expect(res.body.message).toContain('6 fotos');
  });

  it('al pasar a Pro acepta 12 fotos y al volver a Básico no deja agregar más', async () => {
    await setPlan(proId);
    await http()
      .post('/api/products')
      .set(auth())
      .send({ name: 'Polo Doce', price: 30, stock: 2, images: photos(12) })
      .expect(201);
    const eight = await http()
      .post('/api/products')
      .set(auth())
      .send({ name: 'Polo Ocho', price: 30, stock: 2, images: photos(8) })
      .expect(201);
    await setPlan(basicoId);
    // Las 8 fotos que ya tenía se respetan (puede editar el precio sin perderlas)...
    const kept = await http()
      .patch(`/api/products/${eight.body.id}`)
      .set(auth())
      .send({ price: 35, images: photos(8) })
      .expect(200);
    expect(kept.body.images).toHaveLength(8);
    // ...pero no puede agregar una más.
    await http()
      .patch(`/api/products/${eight.body.id}`)
      .set(auth())
      .send({ images: photos(9) })
      .expect(400);
  });

  it('bloquea Excel y Créditos si el plan no los incluye, y los abre al cambiar de plan', async () => {
    await http()
      .get('/api/admin/reports/excel?section=tienda&month=2026-10')
      .set(auth())
      .expect(403);
    await http().get('/api/admin/credits/summary').set(auth()).expect(403);
    await setPlan(proId);
    await http()
      .get('/api/admin/reports/excel?section=tienda&month=2026-10')
      .set(auth())
      .expect(200);
    await http().get('/api/admin/credits/summary').set(auth()).expect(200);
  });

  it('un plan privado no sale en precios ni se puede elegir al registrarse', async () => {
    const privado = await prisma.plan.create({
      data: {
        name: 'Privado Prueba',
        slug: `privado-${tag}`,
        priceMonth: 10,
        isPublic: false,
      },
    });
    try {
      const pub = await http().get('/api/public/plans').expect(200);
      expect(
        (pub.body as Array<{ slug: string }>).some(
          (plan) => plan.slug === privado.slug,
        ),
      ).toBe(false);
      const res = await http()
        .post('/api/auth/register')
        .send({
          responsibleName: 'Dueña Privada',
          email: `privado_${tag}@test.com`,
          password: 'clave12345',
          commercialName: 'Tienda Privada',
          subdomain: `privada-${tag}`,
          whatsappNumber: '+51900000000',
          plan: privado.slug,
        })
        .expect(201);
      const company = await prisma.company.findUniqueOrThrow({
        where: { id: res.body.company.id as string },
        include: { plan: true },
      });
      expect(company.plan?.slug).toBe('basico');
    } finally {
      await prisma.plan.delete({ where: { id: privado.id } });
    }
  });

  it('la landing recibe lo que incluye cada plan', async () => {
    const res = await http().get('/api/public/plans').expect(200);
    const basico = (
      res.body as Array<{ slug: string; maxImages: number; featExcel: boolean }>
    ).find((plan) => plan.slug === 'basico');
    expect(basico).toMatchObject({ maxImages: 6, featExcel: false });
  });
});
