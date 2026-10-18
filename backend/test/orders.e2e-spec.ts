import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

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

  it('un pedido sin pagar NO aparta stock (sigue en 10)', async () => {
    const res = await http()
      .get(`/api/public/stores/${subdomain}/products/producto-test`)
      .expect(200);
    expect(res.body.available).toBe(10);
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

  describe('el stock se aparta al subir el Yape', () => {
    let lonelyId = '';
    const prisma = () => app.get(PrismaService);
    const available = async () =>
      (
        await http()
          .get(`/api/public/stores/${subdomain}/products/producto-abandono`)
          .expect(200)
      ).body.available as number;
    // Simula lo que hace "subir comprobante" (sin OCR ni imagen real).
    const payWithProof = async (code: string) => {
      const order = await prisma().order.findUniqueOrThrow({
        where: { publicCode: code },
        include: { items: true },
      });
      await prisma().$transaction(async (tx) => {
        for (const item of order.items) {
          const affected = await tx.$executeRaw`
            UPDATE products SET reserved = reserved + ${item.quantity}
            WHERE id = ${item.productId} AND (stock - reserved) >= ${item.quantity}`;
          if (affected === 0) throw new Error('agotado');
        }
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'proof_submitted',
            reservationExpiresAt: null,
            stockReserved: true,
          },
        });
      });
    };

    beforeAll(async () => {
      lonelyId = (
        await http()
          .post('/api/products')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Producto Abandono', price: 5, stock: 1 })
          .expect(201)
      ).body.id as string;
    });

    it('dos clientes piden la última unidad: ninguno la aparta hasta pagar y se avisa', async () => {
      const ana = await http()
        .post(`/api/public/stores/${subdomain}/checkout`)
        .send(co([{ productId: lonelyId, quantity: 1 }]))
        .expect(201);
      expect(ana.body.stockWarnings).toEqual([
        expect.objectContaining({ name: 'Producto Abandono', available: 1 }),
      ]);
      const beto = await http()
        .post(`/api/public/stores/${subdomain}/checkout`)
        .send(
          co([{ productId: lonelyId, quantity: 1 }], {
            customerPhone: '+51987000999',
          }),
        )
        .expect(201);
      expect(beto.body.stockWarnings[0].othersBuying).toBe(1);
      expect(await available()).toBe(1);

      // Ana paga primero: se le aparta. Beto ya no puede (se agotó).
      await payWithProof(ana.body.code);
      expect(await available()).toBe(0);
      await expect(payWithProof(beto.body.code)).rejects.toThrow('agotado');

      // Cancelar el pedido de Beto (sin pago) no toca el stock.
      await http()
        .post(`/api/public/stores/${subdomain}/orders/${beto.body.code}/cancel`)
        .expect(201);
      expect(await available()).toBe(0);

      // Con comprobante, Ana ya no puede cancelar sola.
      await http()
        .post(`/api/public/stores/${subdomain}/orders/${ana.body.code}/cancel`)
        .expect(400);
    });

    it('corrige lo separado que no tiene un pedido real detrás', async () => {
      const id = (
        await http()
          .post('/api/products')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Producto Trabado', price: 5, stock: 5 })
          .expect(201)
      ).body.id as string;
      // Pedido viejo: pago rechazado pero quedó "pendiente" apartando 2.
      const order = await http()
        .post(`/api/public/stores/${subdomain}/checkout`)
        .send(co([{ productId: id, quantity: 2 }]))
        .expect(201);
      await prisma().order.update({
        where: { publicCode: order.body.code },
        data: {
          paymentStatus: 'rejected',
          reservationExpiresAt: null,
          stockReserved: true,
        },
      });
      // Y 1 separado más sin ningún pedido (dato huérfano).
      await prisma().product.update({
        where: { id },
        data: { reserved: 3 },
      });

      await http()
        .get('/api/admin/inventory/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const product = await prisma().product.findUniqueOrThrow({
        where: { id },
      });
      expect(product).toMatchObject({ stock: 5, reserved: 0 });
      const view = await http()
        .get(`/api/public/stores/${subdomain}/orders/${order.body.code}`)
        .expect(200);
      expect(view.body.status).toBe('cancelled');
    });

    it('un pedido sin pagar vence sin tocar el stock', async () => {
      const extra = (
        await http()
          .post('/api/products')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Producto Vence', price: 5, stock: 2 })
          .expect(201)
      ).body.id as string;
      const order = await http()
        .post(`/api/public/stores/${subdomain}/checkout`)
        .send(co([{ productId: extra, quantity: 2 }]))
        .expect(201);
      await prisma().order.update({
        where: { publicCode: order.body.code },
        data: { reservationExpiresAt: new Date(Date.now() - 60_000) },
      });
      await http()
        .get('/api/admin/inventory/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const view = await http()
        .get(`/api/public/stores/${subdomain}/orders/${order.body.code}`)
        .expect(200);
      expect(view.body.status).toBe('expired');
      const product = await prisma().product.findUniqueOrThrow({
        where: { id: extra },
      });
      expect(product).toMatchObject({ stock: 2, reserved: 0 });
    });
  });
});
