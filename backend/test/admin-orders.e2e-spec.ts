import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Fase 6: panel del dueño — aprobar pagos, transiciones de estado,
 * efectos en el stock y aislamiento entre empresas.
 */
describe('Panel de pedidos del dueño (e2e)', () => {
  let app: INestApplication;
  const tag = Date.now();
  const subA = `adm-a-${tag}`;
  let tokenA = '';
  let tokenB = '';
  let productId = '';
  let orderId = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    const reg = async (k: string, sub: string) =>
      (
        await request(app.getHttpServer()).post('/api/auth/register').send({
          responsibleName: `D ${k}`,
          email: `adm_${k}_${tag}@test.com`,
          password: 'clave12345',
          commercialName: `T ${k}`,
          subdomain: sub,
          whatsappNumber: '+51900000000',
        })
      ).body.accessToken as string;

    tokenA = await reg('a', subA);
    tokenB = await reg('b', `adm-b-${tag}`);

    productId = (
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Prod Adm', price: 10, stock: 5 })
    ).body.id;

    orderId = (
      await request(app.getHttpServer())
        .post(`/api/public/stores/${subA}/checkout`)
        .send({
          customerName: 'Cliente Test',
          customerPhone: '+51987000000',
          deliveryMethod: 'pickup',
          items: [{ productId, quantity: 2 }],
        })
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const A = () => ({ Authorization: `Bearer ${tokenA}` });
  const B = () => ({ Authorization: `Bearer ${tokenB}` });

  it('el dueño ve sus pedidos', async () => {
    const res = await http().get('/api/admin/orders').set(A()).expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('otra empresa NO puede ver el pedido (aislamiento)', async () => {
    await http().get(`/api/admin/orders/${orderId}`).set(B()).expect(404);
  });

  it('otra empresa NO puede aprobar el pago (aislamiento)', async () => {
    await http()
      .post(`/api/admin/orders/${orderId}/payment/approve`)
      .set(B())
      .expect(404);
  });

  it('aprobar el pago confirma el pedido y compromete el stock', async () => {
    const res = await http()
      .post(`/api/admin/orders/${orderId}/payment/approve`)
      .set(A())
      .expect(201);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.payment.status).toBe('approved');

    // Stock físico bajó de 5 a 3 (2 vendidas).
    const prod = await http()
      .get(`/api/public/stores/${subA}/products/prod-adm`)
      .expect(200);
    expect(prod.body.available).toBe(3);
  });

  it('rechaza una transición inválida de estado', async () => {
    await http()
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(A())
      .send({ status: 'delivered' }) // confirmed -> delivered no es válido
      .expect(400);
  });

  it('permite una transición válida (confirmed -> preparing)', async () => {
    const res = await http()
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(A())
      .send({ status: 'preparing' })
      .expect(200);
    expect(res.body.status).toBe('preparing');
  });
});
