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
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    ownerToken = (
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
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
        .send({ name: 'Producto Test', price: 10, stock: 10 })
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

  it('reserva el stock (disponible baja de 10 a 8)', async () => {
    const res = await http()
      .get(`/api/public/stores/${subdomain}/products/producto-test`)
      .expect(200);
    expect(res.body.available).toBe(8);
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

  it('dos envíos simultáneos con la misma clave crean un solo pedido', async () => {
    const key = `doble-${tag}`;
    const [a, b] = await Promise.all(
      [1, 2].map(() =>
        http()
          .post(`/api/public/stores/${subdomain}/checkout`)
          .set('Idempotency-Key', key)
          .send(
            co([{ productId, quantity: 1 }], { customerName: 'PRUEBA doble' }),
          ),
      ),
    );
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(b.body.code).toBe(a.body.code);
    expect(a.body.customerName).toBe('Prueba Doble');
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

  it('con solo el código, un extraño ve los datos del cliente a medias', async () => {
    const created = await http()
      .post(`/api/public/stores/${subdomain}/checkout`)
      .send(
        co([{ productId, quantity: 1 }], {
          customerName: 'Rosa Huamán Torres',
          customerPhone: '+51 912 345 678',
          deliveryMethod: 'delivery',
          address: 'Av. Giráldez 450, Huancayo',
          reference: 'Frente a la plaza',
        }),
      )
      .expect(201);
    // Quien acaba de comprar ve lo que escribió.
    expect(created.body.customerPhone).toBe('51912345678');
    expect(created.body.address).toBe('Av. Giráldez 450, Huancayo');

    const res = await http()
      .get(`/api/public/stores/${subdomain}/orders/${created.body.code}`)
      .expect(200);
    expect(res.body).toMatchObject({
      customerName: 'Rosa H.',
      customerPhone: '912 *** 678',
      address: 'Av. Giráldez …',
      reference: null,
      proofUrl: null,
      hasProof: false,
    });
  });
});
