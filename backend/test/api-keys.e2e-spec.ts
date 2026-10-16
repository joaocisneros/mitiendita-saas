import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Credenciales de la API pública: URL base + X-Api-Key + X-Api-Secret
 * (con compatibilidad para Authorization: Bearer <secret>).
 */
describe('API Key + Secret (e2e)', () => {
  let app: INestApplication;
  let superToken = '';
  let ownerToken = '';
  let companyId = '';
  let prisma: PrismaService;
  let tokenId = '';
  let apiKey = '';
  let apiSecret = '';
  const tag = Date.now();

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

    const company = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        responsibleName: 'Dueña Api',
        email: `apikey_${tag}@test.com`,
        password: 'clave12345',
        commercialName: 'Tienda Api',
        subdomain: `apikey-${tag}`,
        whatsappNumber: '+51900000000',
      });
    ownerToken = company.body.accessToken;
    companyId = company.body.company.id;
    superToken = (
      await request(app.getHttpServer()).post('/api/superadmin/login').send({
        email: 'admin@mitiendita.localhost',
        password: 'Admin12345',
      })
    ).body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/superadmin/api-tokens/empresas')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        companyId: company.body.company.id,
        name: 'Integración prueba',
        scopes: ['productos'],
      })
      .expect(201);
    apiKey = created.body.apiKey;
    apiSecret = created.body.apiSecret;
    const list = await request(app.getHttpServer())
      .get('/api/superadmin/api-tokens/empresas')
      .set('Authorization', `Bearer ${superToken}`);
    tokenId = (list.body as { id: string; apiKey: string }[]).find(
      (t) => t.apiKey === apiKey,
    )!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const creds = (key: string, secret: string) => ({
    'X-Api-Key': key,
    'X-Api-Secret': secret,
  });

  it('entrega una API Key pública y un API Secret', () => {
    expect(apiKey).toMatch(/^mk_live_/);
    expect(apiSecret).toMatch(/^sk_live_/);
  });

  it('con X-Api-Key + X-Api-Secret responde los módulos permitidos', async () => {
    await http()
      .get('/api/v1/productos')
      .set(creds(apiKey, apiSecret))
      .expect(200);
    // Módulo no habilitado para este token.
    await http()
      .get('/api/v1/pedidos')
      .set(creds(apiKey, apiSecret))
      .expect(403);
  });

  it('rechaza un secret equivocado o incompleto', async () => {
    await http()
      .get('/api/v1/productos')
      .set(creds(apiKey, 'sk_live_falso'))
      .expect(401);
    await http()
      .get('/api/v1/productos')
      .set({ 'X-Api-Key': apiKey })
      .expect(401);
    await http().get('/api/v1/productos').expect(401);
  });

  it('sigue aceptando Authorization: Bearer <secret>', async () => {
    await http()
      .get('/api/v1/productos')
      .set('Authorization', `Bearer ${apiSecret}`)
      .expect(200);
  });

  it('ver credenciales devuelve la key y el secret', async () => {
    const res = await http()
      .post(`/api/superadmin/api-tokens/${tokenId}/reveal`)
      .set('Authorization', `Bearer ${superToken}`)
      .expect(201);
    expect(res.body).toMatchObject({ apiKey, apiSecret });
  });

  it('regenerar el secret invalida el anterior y conserva la key', async () => {
    const res = await http()
      .post(`/api/superadmin/api-tokens/${tokenId}/regenerate`)
      .set('Authorization', `Bearer ${superToken}`)
      .expect(201);
    expect(res.body.apiKey).toBe(apiKey);
    expect(res.body.apiSecret).not.toBe(apiSecret);
    await http()
      .get('/api/v1/productos')
      .set(creds(apiKey, apiSecret))
      .expect(401);
    await http()
      .get('/api/v1/productos')
      .set(creds(apiKey, res.body.apiSecret))
      .expect(200);
  });
  it('cuenta el consumo del mes y muestra el plan de la tienda', async () => {
    // El contador se guarda en segundo plano: se espera un instante.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const list = await http()
      .get('/api/superadmin/api-tokens/empresas')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    const row = (
      list.body as {
        id: string;
        monthlyCalls: number;
        planName: string | null;
      }[]
    ).find((t) => t.id === tokenId)!;
    // Llamadas válidas: productos (key+secret), pedidos (403 no cuenta),
    // Bearer y la del secret nuevo.
    expect(row.monthlyCalls).toBeGreaterThanOrEqual(3);
    expect(row.planName).toBeTruthy();
  });
  it('pedidos traen productos y dirección; créditos traen saldos, ventas y abonos', async () => {
    const owner = { Authorization: `Bearer ${ownerToken}` };
    const productId = (
      await http()
        .post('/api/products')
        .set(owner)
        .send({ name: 'Polo Api', price: 40, stock: 10 })
        .expect(201)
    ).body.id as string;

    // Pedido con entrega a domicilio y comprobante enviado.
    const order = (
      await http()
        .post(`/api/public/stores/apikey-${tag}/checkout`)
        .send({
          customerName: 'Cliente Api',
          customerPhone: '+51 977 111 222',
          deliveryMethod: 'delivery',
          address: 'Av. Integración 123',
          reference: 'Puerta azul',
          items: [{ productId, quantity: 2 }],
        })
        .expect(201)
    ).body as { id: string; code: string };
    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId: order.id },
        data: {
          status: 'proof_submitted',
          proofUrl: 'https://test.local/p.png',
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'proof_submitted', reservationExpiresAt: null },
      }),
    ]);

    // Clienta de crédito con una venta y un abono.
    const clienta = (
      await http()
        .post('/api/admin/credits/customers')
        .set(owner)
        .send({
          firstName: 'Ana',
          lastName: 'Api',
          phone: '977333444',
          address: 'Jr. Uno 1',
        })
        .expect(201)
    ).body.id as string;
    await http()
      .post(`/api/admin/credits/customers/${clienta}/sales`)
      .set(owner)
      .send({ items: [{ productId, quantity: 1 }] })
      .expect(201);
    await http()
      .post(`/api/admin/credits/customers/${clienta}/payments`)
      .set(owner)
      .send({ amount: 15 })
      .expect(201);

    const full = await http()
      .post('/api/superadmin/api-tokens/empresas')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ companyId, name: 'ERP', scopes: ['pedidos', 'creditos'] })
      .expect(201);
    const headers = creds(full.body.apiKey, full.body.apiSecret);

    const pedidos = await http()
      .get('/api/v1/pedidos')
      .set(headers)
      .expect(200);
    const pedido = (
      pedidos.body.items as {
        publicCode: string;
        address: string;
        reference: string;
        items: { name: string; quantity: number; lineTotal: string }[];
      }[]
    ).find((o) => o.publicCode === order.code)!;
    expect(pedido.address).toBe('Av. Integración 123');
    expect(pedido.reference).toBe('Puerta azul');
    expect(pedido.items[0]).toMatchObject({ name: 'Polo Api', quantity: 2 });

    const creditos = await http()
      .get('/api/v1/creditos')
      .set(headers)
      .expect(200);
    expect(creditos.body.resumen.receivable).toBe('25.00');
    expect(creditos.body.items[0]).toMatchObject({
      fullName: 'Ana Api',
      totalSold: '40.00',
      totalPaid: '15.00',
      balance: '25.00',
    });
    const detalle = await http()
      .get(`/api/v1/creditos/${clienta}`)
      .set(headers)
      .expect(200);
    expect(detalle.body.sales[0].items[0].name).toBe('Polo Api');
    expect(detalle.body.payments[0].amount).toBe('15.00');

    // La credencial anterior (solo productos) no puede ver créditos.
    await http().get('/api/v1/creditos').set(creds(apiKey, 'x')).expect(401);
  });
});
