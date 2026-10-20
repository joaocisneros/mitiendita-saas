import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Pruebas de la Fase 0: registro, login, sesión y aislamiento entre empresas.
 * Usa sufijos únicos por corrida para no chocar con datos existentes.
 */
describe('Auth y multi-tenant (e2e)', () => {
  let app: INestApplication;
  const tag = Date.now();

  const companyA = {
    responsibleName: 'Dueño A',
    email: `a_${tag}@test.com`,
    password: 'clave12345',
    commercialName: 'Tienda A',
    subdomain: `tienda-a-${tag}`,
    whatsappNumber: '+51900000001',
  };
  const companyB = {
    responsibleName: 'Dueño B',
    email: `b_${tag}@test.com`,
    password: 'clave12345',
    commercialName: 'Tienda B',
    subdomain: `tienda-b-${tag}`,
    whatsappNumber: '+51900000002',
  };

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
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  let tokenA = '';
  let companyIdA = '';
  let companyIdB = '';
  let refreshA = '';

  it('registra la empresa A y normaliza el subdominio', async () => {
    const res = await http()
      .post('/api/auth/register')
      .send(companyA)
      .expect(201);
    expect(res.body.company.subdomain).toBe(companyA.subdomain);
    expect(res.body.accessToken).toBeDefined();
    companyIdA = res.body.company.id;
    refreshA = res.body.refreshToken;
  });

  it('el registro desde la web recibe los días de prueba configurados', async () => {
    const prisma = app.get(PrismaService);
    const [company, settings] = await Promise.all([
      prisma.company.findUniqueOrThrow({ where: { id: companyIdA } }),
      prisma.platformSettings.findUnique({ where: { id: 1 } }),
    ]);
    const days = settings?.trialDays ?? 14;
    expect(company.subscriptionStatus).toBe('trial');
    const diffDays =
      (company.currentPeriodEndsAt!.getTime() - Date.now()) / 86_400_000;
    expect(Math.round(diffDays)).toBe(days);
  });

  it('registra la empresa B', async () => {
    const res = await http()
      .post('/api/auth/register')
      .send(companyB)
      .expect(201);
    companyIdB = res.body.company.id;
    expect(companyIdB).not.toBe(companyIdA);
  });

  it('rechaza subdominio reservado', async () => {
    await http()
      .post('/api/auth/register')
      .send({ ...companyA, email: `r_${tag}@t.com`, subdomain: 'admin' })
      .expect(409);
  });

  it('rechaza email duplicado', async () => {
    await http()
      .post('/api/auth/register')
      .send({ ...companyA, subdomain: `dup-${tag}` })
      .expect(409);
  });

  it('la prueba gratis empieza con el plan elegido en la web (sin plan: Básico)', async () => {
    const prisma = app.get(PrismaService);
    const res = await http()
      .post('/api/auth/register')
      .send({
        ...companyA,
        email: `plan_${tag}@t.com`,
        subdomain: `plan-pro-${tag}`,
        plan: 'pro',
      })
      .expect(201);
    const planOf = async (id: string) =>
      (
        await prisma.company.findUniqueOrThrow({
          where: { id },
          include: { plan: true },
        })
      ).plan?.slug;
    expect(await planOf(res.body.company.id as string)).toBe('pro');
    expect(await planOf(companyIdA)).toBe('basico');
  });

  it('hace login y entrega tokens', async () => {
    const res = await http()
      .post('/api/auth/login')
      .send({ email: companyA.email, password: companyA.password })
      .expect(200);
    tokenA = res.body.accessToken;
    expect(res.body.companyId).toBe(companyIdA);
  });

  it('el dueño ve el estado de su prueba para el aviso del panel', async () => {
    const res = await http()
      .get('/api/admin/settings/plan')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.subscriptionStatus).toBe('trial');
    expect(res.body.currentPeriodEndsAt).toBeTruthy();
    expect(res.body).toHaveProperty('supportWhatsapp');
    await http().get('/api/admin/settings/plan').expect(401);
  });

  it('rechaza login con contraseña incorrecta', async () => {
    await http()
      .post('/api/auth/login')
      .send({ email: companyA.email, password: 'incorrecta' })
      .expect(401);
  });

  it('exige autenticación en /me', async () => {
    await http().get('/api/auth/me').expect(401);
  });

  it('/me devuelve SIEMPRE el companyId del token (no se puede falsificar)', async () => {
    const res = await http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    // El usuario A solo puede ver su propia empresa, nunca la de B.
    expect(res.body.companyId).toBe(companyIdA);
    expect(res.body.companyId).not.toBe(companyIdB);
  });

  it('renueva tokens y revoca el refresh anterior (rotación)', async () => {
    const res = await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshA })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();

    // El refresh token viejo ya no debe servir.
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshA })
      .expect(401);
  });
  it('cerrar sesión con un token incompleto o falso no cierra la sesión real', async () => {
    const login = await http()
      .post('/api/auth/login')
      .send({ email: companyA.email, password: companyA.password })
      .expect(200);
    const real = login.body.refreshToken as string;
    const [id] = real.split('.');
    await http()
      .post('/api/auth/logout')
      .send({ refreshToken: `${id}.secreto-inventado` })
      .expect(200);
    // La sesión real sigue viva y se puede renovar.
    const renewed = await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: real })
      .expect(200);
    // Con el token completo sí se cierra.
    await http()
      .post('/api/auth/logout')
      .send({ refreshToken: renewed.body.refreshToken })
      .expect(200);
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: renewed.body.refreshToken })
      .expect(401);
  });
});
