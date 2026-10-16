import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

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
  let prisma: PrismaService;

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

    const reg = async (k: string, sub: string) =>
      (
        await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
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

  it('no muestra como pedido un checkout que todavía no tiene comprobante', async () => {
    const res = await http().get('/api/admin/orders').set(A()).expect(200);
    expect(
      res.body.items.some((order: { id: string }) => order.id === orderId),
    ).toBe(false);
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

  it('un checkout sin compra completada NO aparece en Clientes', async () => {
    const res = await http().get('/api/customers').set(A()).expect(200);
    expect(
      res.body.items.some((customer: { phone: string }) =>
        customer.phone.includes('987000000'),
      ),
    ).toBe(false);
  });

  it('aprobar el pago confirma el pedido y compromete el stock', async () => {
    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId },
        data: {
          status: 'proof_submitted',
          proofUrl: 'https://test.local/demo.png',
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'proof_submitted', reservationExpiresAt: null },
      }),
    ]);
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

  it('con la compra aprobada, la persona aparece en Clientes', async () => {
    const res = await http().get('/api/customers').set(A()).expect(200);
    const customer = (
      res.body.items as { phone: string; ordersCount: number }[]
    ).find((item) => item.phone.includes('987000000'));
    expect(customer?.ordersCount).toBe(1);
  });

  it('un intento cancelado con el mismo celular no cambia el nombre del cliente', async () => {
    const attemptId = (
      await http()
        .post(`/api/public/stores/${subA}/checkout`)
        .send({
          customerName: 'Nombre Del Intento',
          customerPhone: '+51987000000',
          deliveryMethod: 'pickup',
          address: 'Otra dirección',
          items: [{ productId, quantity: 1 }],
        })
        .expect(201)
    ).body.id as string;
    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId: attemptId },
        data: {
          status: 'proof_submitted',
          proofUrl: 'https://test.local/x.png',
        },
      }),
      prisma.order.update({
        where: { id: attemptId },
        data: { paymentStatus: 'proof_submitted', reservationExpiresAt: null },
      }),
    ]);
    await http()
      .post(`/api/admin/orders/${attemptId}/payment/reject`)
      .set(A())
      .send({ comment: 'Prueba cancelada' })
      .expect(201);

    const res = await http().get('/api/customers').set(A()).expect(200);
    const customer = (
      res.body.items as { phone: string; name: string; ordersCount: number }[]
    ).find((item) => item.phone.includes('987000000'));
    expect(customer?.name).toBe('Cliente Test');
    expect(customer?.ordersCount).toBe(1);
  });

  it('otra empresa NO puede consultar el detalle del cliente', async () => {
    const list = await http().get('/api/customers').set(A()).expect(200);
    const customerId = list.body.items[0].id as string;
    await http().get(`/api/customers/${customerId}`).set(B()).expect(404);
  });

  it('rechazar un pedido pendiente lo cancela y libera todo el stock reservado', async () => {
    const rejectedOrderId = (
      await http()
        .post(`/api/public/stores/${subA}/checkout`)
        .send({
          customerName: 'Cliente Rechazado',
          customerPhone: '+51987000001',
          deliveryMethod: 'pickup',
          items: [{ productId, quantity: 1 }],
        })
        .expect(201)
    ).body.id as string;

    const reserved = await http()
      .get('/api/admin/inventory/products')
      .set(A())
      .expect(200);
    const beforeReject = reserved.body.find(
      (product: { id: string }) => product.id === productId,
    );
    expect(beforeReject.stock).toBe(3);
    expect(beforeReject.reserved).toBe(1);
    expect(beforeReject.available).toBe(2);

    const rejected = await http()
      .post(`/api/admin/orders/${rejectedOrderId}/payment/reject`)
      .set(A())
      .send({ comment: 'El cliente canceló el pago' })
      .expect(201);
    expect(rejected.body.status).toBe('cancelled');
    expect(rejected.body.payment.status).toBe('rejected');

    const released = await http()
      .get('/api/admin/inventory/products')
      .set(A())
      .expect(200);
    const afterReject = released.body.find(
      (product: { id: string }) => product.id === productId,
    );
    expect(afterReject.stock).toBe(3);
    expect(afterReject.reserved).toBe(0);
    expect(afterReject.available).toBe(3);

    // "Todos" no muestra el rechazado; su pestaña sí. Y no es cliente.
    const all = await http().get('/api/admin/orders').set(A()).expect(200);
    const ids = (all.body.items as { id: string }[]).map((o) => o.id);
    expect(ids).toContain(orderId);
    expect(ids).not.toContain(rejectedOrderId);
    const tab = await http()
      .get('/api/admin/orders?paymentStatus=rejected')
      .set(A())
      .expect(200);
    expect(
      (tab.body.items as { id: string }[]).some(
        (o) => o.id === rejectedOrderId,
      ),
    ).toBe(true);
    const customers = await http().get('/api/customers').set(A());
    expect(
      (customers.body.items as { phone: string }[]).some((c) =>
        c.phone.includes('987000001'),
      ),
    ).toBe(false);
  });

  it('incluye métricas y productos más vendidos en el dashboard', async () => {
    const res = await http().get('/api/admin/dashboard').set(A()).expect(200);
    expect(res.body).toHaveProperty('salesToday');
    expect(res.body).toHaveProperty('topProducts');
    expect(
      res.body.topProducts.some(
        (product: { name: string }) => product.name === 'Prod Adm',
      ),
    ).toBe(true);
  });

  it('rechaza una transición inválida de estado', async () => {
    await http()
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(A())
      .send({ status: 'preparing' }) // recojo usa el flujo corto: no pasa por preparando
      .expect(400);
  });

  it('permite una transición válida de recojo (confirmed -> delivered)', async () => {
    const res = await http()
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(A())
      .send({ status: 'delivered' })
      .expect(200);
    expect(res.body.status).toBe('delivered');
  });
});
