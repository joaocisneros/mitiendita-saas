import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Consultas RUC/DNI del superadmin (CismaFact) y autocompletado de DNI en
 * Créditos. El proveedor se simula: no se consultan documentos reales.
 */
describe('Consultas RUC/DNI (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superToken = '';
  let ownerToken = '';
  const tag = Date.now();
  const realFetch = global.fetch;

  /** Simula la próxima respuesta de CismaFact. */
  const provider = (status: number, body: unknown) => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
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
    prisma = app.get(PrismaService);
    await prisma.documentApiConfig.deleteMany();

    superToken = (
      await request(app.getHttpServer()).post('/api/superadmin/login').send({
        email: 'admin@mitiendita.localhost',
        password: 'Admin12345',
      })
    ).body.accessToken;
    ownerToken = (
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          responsibleName: 'Dueña Dni',
          email: `dni_${tag}@test.com`,
          password: 'clave12345',
          commercialName: 'Tienda Dni',
          subdomain: `dni-${tag}`,
          whatsappNumber: '+51900000000',
          businessType: 'Moda y accesorios',
        })
    ).body.accessToken;
  });

  afterAll(async () => {
    global.fetch = realFetch;
    await prisma.documentApiConfig.deleteMany();
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const SA = () => ({ Authorization: `Bearer ${superToken}` });
  const OWNER = () => ({ Authorization: `Bearer ${ownerToken}` });

  it('empieza sin configurar y no permite guardar sin credenciales', async () => {
    const res = await http()
      .get('/api/superadmin/ruc-dni/config')
      .set(SA())
      .expect(200);
    expect(res.body.configured).toBe(false);
    await http()
      .patch('/api/superadmin/ruc-dni/config')
      .set(SA())
      .send({ enabled: true })
      .expect(400);
  });

  it('una tienda no puede usar el módulo del superadmin', async () => {
    await http().get('/api/superadmin/ruc-dni/config').set(OWNER()).expect(403);
  });

  it('prueba credenciales nuevas y las guarda cifradas', async () => {
    provider(200, { success: true, data: { plan: 'free', servicios: [] } });
    await http()
      .post('/api/superadmin/ruc-dni/test')
      .set(SA())
      .send({ apiKey: 'key-123456', apiSecret: 'secret-abc' })
      .expect(201);
    const saved = await http()
      .patch('/api/superadmin/ruc-dni/config')
      .set(SA())
      .send({ apiKey: 'key-123456', apiSecret: 'secret-abc', enabled: false })
      .expect(200);
    expect(saved.body.configured).toBe(true);
    expect(saved.body.enabled).toBe(false);
    expect(saved.body.apiKeyMasked).toMatch(/3456$/);
    const row = await prisma.documentApiConfig.findUniqueOrThrow({
      where: { id: 1 },
    });
    expect(row.apiKeyEncrypted).not.toContain('key-123456');
  });

  it('desactivada: no consulta, pero sí permite probar para reactivarla', async () => {
    await http()
      .get('/api/superadmin/ruc-dni/dni/12345678')
      .set(SA())
      .expect(503);
    provider(200, { success: true, data: { plan: 'free', servicios: [] } });
    await http()
      .post('/api/superadmin/ruc-dni/test')
      .set(SA())
      .send({})
      .expect(201);
    await http()
      .patch('/api/superadmin/ruc-dni/config')
      .set(SA())
      .send({ enabled: true })
      .expect(200);
  });

  it('valida la cantidad de dígitos', async () => {
    await http().get('/api/superadmin/ruc-dni/dni/1234').set(SA()).expect(400);
    await http().get('/api/superadmin/ruc-dni/ruc/123').set(SA()).expect(400);
  });

  it('consulta un DNI y muestra el error del proveedor', async () => {
    provider(200, {
      success: true,
      data: { tipo: 'dni', numero: '12345678', nombres: 'MARIA' },
    });
    const ok = await http()
      .get('/api/superadmin/ruc-dni/dni/12345678')
      .set(SA())
      .expect(200);
    expect(ok.body.nombres).toBe('MARIA');

    provider(404, { success: false, message: 'Documento no encontrado' });
    const fail = await http()
      .get('/api/superadmin/ruc-dni/dni/87654321')
      .set(SA())
      .expect(502);
    expect(fail.body.message).toBe('Documento no encontrado');
  });

  it('Créditos autocompleta el DNI con mayúscula inicial', async () => {
    provider(200, {
      success: true,
      data: {
        nombres: 'MARÍA ELENA',
        apellido_paterno: 'QUISPE',
        apellido_materno: 'DE LA CRUZ',
      },
    });
    const res = await http()
      .get('/api/admin/credits/dni/12345678')
      .set(OWNER())
      .expect(200);
    expect(res.body.firstName).toBe('María Elena');
    expect(res.body.lastName).toBe('Quispe De La Cruz');
    expect(res.body.existingCustomerId).toBeNull();
  });

  it('credenciales ilegibles responden con un mensaje claro', async () => {
    await prisma.documentApiConfig.update({
      where: { id: 1 },
      data: { apiKeyEncrypted: 'dañado', apiSecretEncrypted: 'dañado' },
    });
    const res = await http()
      .get('/api/superadmin/ruc-dni/dni/12345678')
      .set(SA())
      .expect(503);
    expect(res.body.message).toContain('Vuelve a ingresarlas');
    await http()
      .get('/api/admin/credits/dni/12345678')
      .set(OWNER())
      .expect(503);
  });
});
