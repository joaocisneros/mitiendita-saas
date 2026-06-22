import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Fase 4: flujo de pedido (checkout público).
 * Cubre recálculo en servidor, reserva de stock, idempotencia y anti-sobreventa.
 */
describe('Pedidos / checkout (e2e)', () => {
  let app: INestApplication;
  const tag = Date.now();
  const subdomain = `tienda-ord-${tag}`;
  let ownerToken = '';
  let productId = '';

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

    ownerToken = (
      await request(app.getHttpServer()).post('/api/auth/register').send({
        responsibleName: 'Dueño Ord',
        email: `ord_${tag}@test.com`,
        password: 'clave12345',
        commercialName: 'Tienda Ord',
        subdomain,
        whatsappNumber: '+51900000000',
      })
    ).body.accessToken;

    // Producto con stock conocido = 5.
    productId = (
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Producto Test', price: 10, stock: 5 })
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const co = (items: unknown, extra = {}) => ({
    customerName: 'Cliente',
    customerPhone: '+51987000000',
    deliveryMethod: 'pickup',
    items,
    ...extra,
  });

  it('crea un pedido y calcula el total en el servidor', async () => {
    const res = await http()
      .post(`/api/public/stores/${subdomain}/checkout`)
      .send(co([{ productId, quantity: 2 }]))
      .expect(201);
    expect(res.body.total).toBe('20'); // 2 x 10
    expect(res.body.code).toMatch(/^MT-/);
    expect(res.body.status).toBe('pending');
  });

  it('reserva el stock (disponible baja de 5 a 3)', async () => {
    const res = await http()
      .get(`/api/public/stores/${subdomain}/products/producto-test`)
      .expect(200);
    expect(res.body.available).toBe(3);
  });

  it('es idempotente con Idempotency-Key', async () => {
    const key = `k-${tag}`;
    const a = await http()
      .post(`/api/public/stores/${subdomain}/checkout`)
      .set('Idempotency-Key', key)
      .send(co([{ productId, quantity: 1 }]))
      .expect(201);
    const b = await http()
      .post(`/api/public/stores/${subdomain}/checkout`)
      .set('Idempotency-Key', key)
      .send(co([{ productId, quantity: 1 }]))
      .expect(201);
    expect(b.body.code).toBe(a.body.code); // no duplica
  });

  it('previene la sobreventa', async () => {
    await http()
      .post(`/api/public/stores/${subdomain}/checkout`)
      .send(co([{ productId, quantity: 999 }]))
      .expect(409);
  });

  it('rechaza delivery sin dirección', async () => {
    await http()
      .post(`/api/public/stores/${subdomain}/checkout`)
      .send(co([{ productId, quantity: 1 }], { deliveryMethod: 'delivery' }))
      .expect(400);
  });

  it('permite seguir el pedido por su código', async () => {
    const created = await http()
      .post(`/api/public/stores/${subdomain}/checkout`)
      .send(co([{ productId, quantity: 1 }]))
      .expect(201);
    const res = await http()
      .get(`/api/public/stores/${subdomain}/orders/${created.body.code}`)
      .expect(200);
    expect(res.body.code).toBe(created.body.code);
  });
});
