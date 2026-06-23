import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Fase 7: superadmin (gestión de empresas) + configuración de tienda.
 */
describe('Superadmin y configuración (e2e)', () => {
  let app: INestApplication;
  const tag = Date.now();
  const sub = `sa-${tag}`;
  let ownerToken = '';
  let superToken = '';
  let companyId = '';

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

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        responsibleName: 'Dueño SA',
        email: `sa_${tag}@test.com`,
        password: 'clave12345',
        commercialName: 'Tienda SA',
        subdomain: sub,
        whatsappNumber: '+51900000000',
      });
    ownerToken = reg.body.accessToken;
    companyId = reg.body.company.id;

    superToken = (
      await request(app.getHttpServer()).post('/api/superadmin/login').send({
        email: 'admin@mitiendita.localhost',
        password: 'Admin12345',
      })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('el superadmin inicia sesión y ve métricas', async () => {
    expect(superToken).toBeDefined();
    const res = await http()
      .get('/api/superadmin/stats')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    expect(res.body.totalCompanies).toBeGreaterThanOrEqual(1);
  });

  it('un dueño NO puede acceder al superadmin (403)', async () => {
    await http()
      .get('/api/superadmin/stats')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);
  });

  it('lista empresas con paginación y permite ver su detalle', async () => {
    const list = await http()
      .get('/api/superadmin/companies?page=1&limit=10')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    expect(list.body.items).toBeInstanceOf(Array);
    expect(list.body.total).toBeGreaterThanOrEqual(1);
    const detail = await http()
      .get(`/api/superadmin/companies/${companyId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    expect(detail.body.id).toBe(companyId);
    expect(detail.body).toHaveProperty('grossVolume');
  });

  it('permite al superadmin crear una empresa con propietario y subdominio', async () => {
    const created = await http()
      .post('/api/superadmin/companies')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        responsibleName: 'Propietaria Nueva',
        email: `nueva_${tag}@test.com`,
        password: 'clave12345',
        commercialName: 'Empresa Nueva',
        subdomain: `empresa-nueva-${tag}`,
        whatsappNumber: '51987654321',
        businessType: 'Bodega o minimarket',
      })
      .expect(201);

    expect(created.body.name).toBe('Empresa Nueva');
    expect(created.body.subdomain).toBe(`empresa-nueva-${tag}`);
    expect(created.body.owner.email).toBe(`nueva_${tag}@test.com`);
    expect(created.body.trialEndsAt).toBeDefined();
  });

  it('crea, actualiza y asigna un plan', async () => {
    const created = await http()
      .post('/api/superadmin/plans')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        name: 'Plan Prueba',
        slug: `plan-prueba-${tag}`,
        priceMonth: 59,
        maxProducts: 120,
      })
      .expect(201);
    const planId = created.body.id as number;
    await http()
      .patch(`/api/superadmin/plans/${planId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ priceMonth: 69 })
      .expect(200);
    await http()
      .patch(`/api/superadmin/companies/${companyId}/plan`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ planId })
      .expect(200);
  });

  it('suspender una tienda la deja inaccesible al público', async () => {
    await http()
      .post(`/api/superadmin/companies/${companyId}/suspend`)
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    await http().get(`/api/public/stores/${sub}`).expect(403);

    // Reactivar la deja disponible otra vez.
    await http()
      .post(`/api/superadmin/companies/${companyId}/activate`)
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    await http().get(`/api/public/stores/${sub}`).expect(200);
  });

  it('el dueño actualiza la configuración de su tienda', async () => {
    const res = await http()
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ storeName: 'Nuevo Nombre', primaryColor: '#ff0000' })
      .expect(200);
    expect(res.body.storeName).toBe('Nuevo Nombre');
    expect(res.body.primaryColor).toBe('#ff0000');
  });

  it('registra las acciones sensibles en la auditoría', async () => {
    const res = await http()
      .get('/api/superadmin/audits')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(
      res.body.items.some(
        (row: { companyId: string | null }) => row.companyId === companyId,
      ),
    ).toBe(true);
  });
});
