import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Ventas al crédito: stock, abonos parciales,
 * saldo, anulación y aislamiento entre empresas.
 */
describe('Ventas al crédito (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tag = Date.now();
  let tokenA = '';
  let tokenB = '';
  let productId = '';
  let variantProductId = '';
  let customerId = '';
  let firstSaleId = '';
  let secondSaleId = '';

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

    const reg = async (k: string) =>
      (
        await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            responsibleName: `D ${k}`,
            email: `cred_${k}_${tag}@test.com`,
            password: 'clave12345',
            commercialName: `T ${k}`,
            subdomain: `cred-${k}-${tag}`,
            whatsappNumber: '+51900000000',
          })
      ).body.accessToken as string;
    tokenA = await reg('a');
    tokenB = await reg('b');

    productId = (
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Casaca Denim', price: 100, stock: 5 })
    ).body.id;

    variantProductId = (
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Zapatilla Urbana',
          price: 80,
          stock: 3,
          variantStocks: [
            { size: '38', color: 'Negro', stock: 2 },
            { size: '39', color: 'Negro', stock: 1 },
          ],
        })
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const A = () => ({ Authorization: `Bearer ${tokenA}` });
  const B = () => ({ Authorization: `Bearer ${tokenB}` });
  const stockOf = async (id: string) =>
    (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

  it('registra a la clienta con su dirección de cobro', async () => {
    const res = await http()
      .post('/api/admin/credits/customers')
      .set(A())
      .send({
        firstName: 'maria',
        lastName: 'quispe rojas',
        phone: '987 111 222',
        address: 'Jr. Las Flores 123, Huancayo',
        reference: 'Frente al mercado',
      })
      .expect(201);
    customerId = res.body.id;
    expect(res.body.fullName).toBe('Maria Quispe Rojas');
    expect(res.body.phone).toBe('987111222');
  });

  it('no permite dos clientas con el mismo celular', async () => {
    await http()
      .post('/api/admin/credits/customers')
      .set(A())
      .send({
        firstName: 'Otra',
        lastName: 'Persona',
        phone: '987111222',
        address: 'Otra dirección',
      })
      .expect(409);
  });

  it('guarda el DNI, no lo repite y permite buscar por él', async () => {
    const res = await http()
      .post('/api/admin/credits/customers')
      .set(A())
      .send({
        documentNumber: '45678912',
        firstName: 'LUCIA',
        lastName: 'DE LA CRUZ PEREZ',
        phone: '987222333',
        address: 'Av. Real 100',
      })
      .expect(201);
    expect(res.body.fullName).toBe('Lucia De La Cruz Perez');
    expect(res.body.documentNumber).toBe('45678912');
    await http()
      .post('/api/admin/credits/customers')
      .set(A())
      .send({
        documentNumber: '45678912',
        firstName: 'Otra',
        lastName: 'Persona',
        phone: '987222444',
        address: 'Otra',
      })
      .expect(409);
    await http()
      .post('/api/admin/credits/customers')
      .set(A())
      .send({
        documentNumber: '1234',
        firstName: 'Mal',
        lastName: 'Dni',
        phone: '987222555',
        address: 'Otra',
      })
      .expect(400);
    const found = await http()
      .get('/api/admin/credits/customers?search=45678912')
      .set(A())
      .expect(200);
    expect(found.body.items[0].id).toBe(res.body.id);
  });

  it('dos registros simultáneos con el mismo celular no duplican', async () => {
    const body = {
      firstName: 'Doble',
      lastName: 'Registro',
      phone: '987333444',
      address: 'Jr. Uno 1',
      documentNumber: '41112222',
    };
    const results = await Promise.all([
      http().post('/api/admin/credits/customers').set(A()).send(body),
      http().post('/api/admin/credits/customers').set(A()).send(body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const found = await http()
      .get('/api/admin/credits/customers?search=987333444')
      .set(A());
    expect(found.body.total).toBe(1);
  });

  it('no guarda nombres ni direcciones vacías y tolera páginas inválidas', async () => {
    await http()
      .post('/api/admin/credits/customers')
      .set(A())
      .send({
        firstName: '   ',
        lastName: 'Ok',
        phone: '987333555',
        address: 'Jr. Dos 2',
      })
      .expect(400);
    await http()
      .post('/api/admin/credits/customers')
      .set(A())
      .send({
        firstName: 'Ok',
        lastName: 'Ok',
        phone: '987333555',
        address: '     ',
      })
      .expect(400);
    await http()
      .get('/api/admin/credits/customers?page=abc&limit=xyz')
      .set(A())
      .expect(200);
  });

  it('entrega un producto al crédito y descuenta el stock', async () => {
    const res = await http()
      .post(`/api/admin/credits/customers/${customerId}/sales`)
      .set(A())
      .send({ items: [{ productId, quantity: 1 }] })
      .expect(201);
    firstSaleId = res.body.id;
    expect(res.body.code).toMatch(/^CR-/);
    expect(res.body.total).toBe('100.00');
    expect(await stockOf(productId)).toBe(4);
    const movement = await prisma.stockMovement.findFirst({
      where: { productId, reason: { contains: res.body.code } },
    });
    expect(movement?.quantity).toBe(-1);
  });

  it('descuenta el stock de la talla y color elegidos', async () => {
    const res = await http()
      .post(`/api/admin/credits/customers/${customerId}/sales`)
      .set(A())
      .send({
        items: [
          {
            productId: variantProductId,
            quantity: 1,
            size: '39',
            color: 'Negro',
            unitPrice: 75,
          },
        ],
      })
      .expect(201);
    secondSaleId = res.body.id;
    expect(res.body.total).toBe('75.00');
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: variantProductId },
    });
    const rows = product.variantStocks as Array<{
      size: string;
      stock: number;
    }>;
    expect(rows.find((row) => row.size === '39')?.stock).toBe(0);
    expect(product.stock).toBe(2);
  });

  it('no entrega más unidades de las que hay', async () => {
    await http()
      .post(`/api/admin/credits/customers/${customerId}/sales`)
      .set(A())
      .send({
        items: [
          {
            productId: variantProductId,
            quantity: 1,
            size: '39',
            color: 'Negro',
          },
        ],
      })
      .expect(409);
    expect(await stockOf(variantProductId)).toBe(2);
  });

  it('los abonos parciales se aplican primero a la venta más antigua', async () => {
    await http()
      .post(`/api/admin/credits/customers/${customerId}/payments`)
      .set(A())
      .send({ amount: 60, method: 'cash' })
      .expect(201);
    const res = await http()
      .post(`/api/admin/credits/customers/${customerId}/payments`)
      .set(A())
      .send({ amount: 50, method: 'yape' })
      .expect(201);
    expect(res.body.balance).toBe('65.00');

    const detail = await http()
      .get(`/api/admin/credits/customers/${customerId}`)
      .set(A())
      .expect(200);
    expect(detail.body.balance).toBe('65.00');
    const first = detail.body.sales.find(
      (s: { id: string }) => s.id === firstSaleId,
    );
    const second = detail.body.sales.find(
      (s: { id: string }) => s.id === secondSaleId,
    );
    expect(first.status).toBe('paid');
    expect(second.status).toBe('pending');
    expect(second.paidAmount).toBe('10.00');
  });

  it('no acepta un abono mayor al saldo', async () => {
    await http()
      .post(`/api/admin/credits/customers/${customerId}/payments`)
      .set(A())
      .send({ amount: 65.01 })
      .expect(400);
  });

  it('no anula una venta que ya tiene abonos', async () => {
    await http()
      .post(`/api/admin/credits/sales/${secondSaleId}/cancel`)
      .set(A())
      .send({})
      .expect(400);
  });

  it('eliminar el último abono recalcula el saldo', async () => {
    const detail = await http()
      .get(`/api/admin/credits/customers/${customerId}`)
      .set(A());
    const latest = detail.body.payments.find(
      (p: { canDelete: boolean }) => p.canDelete,
    );
    const older = detail.body.payments.find(
      (p: { canDelete: boolean }) => !p.canDelete,
    );
    await http()
      .delete(`/api/admin/credits/payments/${older.id}`)
      .set(A())
      .expect(400);
    await http()
      .delete(`/api/admin/credits/payments/${latest.id}`)
      .set(A())
      .expect(200);
    const after = await http()
      .get(`/api/admin/credits/customers/${customerId}`)
      .set(A());
    expect(after.body.balance).toBe('115.00');
    const second = after.body.sales.find(
      (s: { id: string }) => s.id === secondSaleId,
    );
    expect(second.paidAmount).toBe('0.00');
  });

  it('corrige el último abono y recalcula el saldo', async () => {
    const created = await http()
      .post(`/api/admin/credits/customers/${customerId}/payments`)
      .set(A())
      .send({ amount: 10, method: 'cash' })
      .expect(201);
    const fixed = await http()
      .patch(`/api/admin/credits/payments/${created.body.id}`)
      .set(A())
      .send({ amount: 15, method: 'yape' })
      .expect(200);
    expect(fixed.body.balance).toBe('100.00');
    expect(fixed.body.method).toBe('yape');
    await http()
      .patch(`/api/admin/credits/payments/${created.body.id}`)
      .set(A())
      .send({ amount: 116 })
      .expect(400);
    const detail = await http()
      .get(`/api/admin/credits/customers/${customerId}`)
      .set(A());
    const older = (
      detail.body.payments as { id: string; canDelete: boolean }[]
    ).find((p) => !p.canDelete)!;
    await http()
      .patch(`/api/admin/credits/payments/${older.id}`)
      .set(A())
      .send({ amount: 1 })
      .expect(400);
    await http()
      .patch(`/api/admin/credits/payments/${created.body.id}`)
      .set(B())
      .send({ amount: 1 })
      .expect(404);
    await http()
      .delete(`/api/admin/credits/payments/${created.body.id}`)
      .set(A())
      .expect(200);
  });

  it('anular una venta sin abonos devuelve el stock', async () => {
    const res = await http()
      .post(`/api/admin/credits/sales/${secondSaleId}/cancel`)
      .set(A())
      .send({ reason: 'Talla equivocada' })
      .expect(201);
    expect(res.body.status).toBe('cancelled');
    expect(await stockOf(variantProductId)).toBe(3);
  });

  it('pagar todo deja a la clienta al día', async () => {
    await http()
      .post(`/api/admin/credits/customers/${customerId}/payments`)
      .set(A())
      .send({ amount: 40 })
      .expect(201);
    const summary = await http()
      .get('/api/admin/credits/summary')
      .set(A())
      .expect(200);
    expect(summary.body.receivable).toBe('0.00');
    const clear = await http()
      .get('/api/admin/credits/customers?status=clear')
      .set(A())
      .expect(200);
    expect(
      clear.body.items.some((c: { id: string }) => c.id === customerId),
    ).toBe(true);
  });

  it('un abono a una venta específica se aplica solo a esa venta', async () => {
    const older = await http()
      .post(`/api/admin/credits/customers/${customerId}/sales`)
      .set(A())
      .send({ items: [{ productId, quantity: 1, unitPrice: 30 }] })
      .expect(201);
    const newer = await http()
      .post(`/api/admin/credits/customers/${customerId}/sales`)
      .set(A())
      .send({ items: [{ productId, quantity: 1, unitPrice: 20 }] })
      .expect(201);
    await http()
      .post(`/api/admin/credits/customers/${customerId}/payments`)
      .set(A())
      .send({ amount: 25, creditSaleId: newer.body.id })
      .expect(400);
    await http()
      .post(`/api/admin/credits/customers/${customerId}/payments`)
      .set(A())
      .send({ amount: 20, creditSaleId: newer.body.id })
      .expect(201);
    const detail = await http()
      .get(`/api/admin/credits/customers/${customerId}`)
      .set(A());
    type SaleRow = { id: string; status: string; paidAmount: string };
    const sales = detail.body.sales as SaleRow[];
    const byId = (id: string) => sales.find((s) => s.id === id)!;
    expect(byId(newer.body.id).status).toBe('paid');
    expect(byId(older.body.id).paidAmount).toBe('0.00');
    expect(detail.body.balance).toBe('30.00');
    expect(
      detail.body.payments.find(
        (p: { saleCode: string | null }) => p.saleCode === newer.body.code,
      ),
    ).toBeTruthy();
    await http()
      .post(`/api/admin/credits/customers/${customerId}/payments`)
      .set(A())
      .send({ amount: 30 })
      .expect(201);
  });

  it('respeta el límite de crédito', async () => {
    await http()
      .patch(`/api/admin/credits/customers/${customerId}`)
      .set(A())
      .send({ creditLimit: 50 })
      .expect(200);
    await http()
      .post(`/api/admin/credits/customers/${customerId}/sales`)
      .set(A())
      .send({ items: [{ productId, quantity: 1 }] })
      .expect(400);
  });

  it('otra empresa no puede ver ni cobrar a la clienta', async () => {
    await http()
      .get(`/api/admin/credits/customers/${customerId}`)
      .set(B())
      .expect(404);
    await http()
      .post(`/api/admin/credits/customers/${customerId}/payments`)
      .set(B())
      .send({ amount: 1 })
      .expect(404);
    await http()
      .post(`/api/admin/credits/sales/${firstSaleId}/cancel`)
      .set(B())
      .send({})
      .expect(404);
  });
  it('las clientas de Créditos aparecen en el directorio de WhatsApp del superadmin', async () => {
    const superToken = (
      await http().post('/api/superadmin/login').send({
        email: 'admin@mitiendita.localhost',
        password: 'Admin12345',
      })
    ).body.accessToken as string;
    const res = await http()
      .get('/api/superadmin/whatsapp/directorio?role=Crédito&search=987111222')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    expect(res.body.items[0]).toMatchObject({
      nombre: 'Maria Quispe Rojas',
      telefono: '51987111222',
      rol: 'Cliente',
      credito: true,
    });
    expect(res.body.summary.credit).toBeGreaterThanOrEqual(1);
  });

  it('solo lista activas por defecto; las desactivadas van en su propio filtro', async () => {
    const id = (
      await http()
        .post('/api/admin/credits/customers')
        .set(A())
        .send({
          firstName: 'Inés',
          lastName: 'Oculta',
          phone: '987555111',
          address: 'Jr. Uno 1',
        })
        .expect(201)
    ).body.id as string;
    await http()
      .patch(`/api/admin/credits/customers/${id}`)
      .set(A())
      .send({ isActive: false })
      .expect(200);

    const ids = (body: { items: { id: string }[] }) =>
      body.items.map((c) => c.id);
    const active = await http()
      .get('/api/admin/credits/customers?limit=100')
      .set(A())
      .expect(200);
    expect(ids(active.body)).not.toContain(id);
    const inactive = await http()
      .get('/api/admin/credits/customers?status=inactive&limit=100')
      .set(A())
      .expect(200);
    expect(ids(inactive.body)).toContain(id);
  });

  it('elimina a una clienta sin historial, pero no a una con ventas', async () => {
    // Con ventas: se rechaza y se pide desactivarla.
    await http()
      .delete(`/api/admin/credits/customers/${customerId}`)
      .set(A())
      .expect(409);

    const id = (
      await http()
        .post('/api/admin/credits/customers')
        .set(A())
        .send({
          firstName: 'Registro',
          lastName: 'Por Error',
          phone: '987555222',
          address: 'Jr. Dos 2',
        })
        .expect(201)
    ).body.id as string;
    // Otra empresa no puede borrarla.
    await http()
      .delete(`/api/admin/credits/customers/${id}`)
      .set(B())
      .expect(404);
    await http()
      .delete(`/api/admin/credits/customers/${id}`)
      .set(A())
      .expect(200);
    await http().get(`/api/admin/credits/customers/${id}`).set(A()).expect(404);
  });

  it('guarda nombre, dirección y referencia escritos en mayúsculas con formato normal', async () => {
    const res = await http()
      .post('/api/admin/credits/customers')
      .set(A())
      .send({
        firstName: 'ROSA',
        lastName: 'HUAMÁN TORRES',
        phone: '987555333',
        address: 'AV. GIRÁLDEZ 450, HUANCAYO',
        reference: 'FRENTE AL PARQUE',
      })
      .expect(201);
    expect(res.body.fullName).toBe('Rosa Huamán Torres');
    expect(res.body.address).toBe('Av. Giráldez 450, Huancayo');
    expect(res.body.reference).toBe('Frente al Parque');
  });

  it('guarda la fecha de cumpleaños opcional y permite borrarla', async () => {
    const res = await http()
      .post('/api/admin/credits/customers')
      .set(A())
      .send({
        firstName: 'Lucía',
        lastName: 'Paredes',
        phone: '987555444',
        address: 'Jr. Lima 123',
        birthday: '1995-03-21',
      })
      .expect(201);
    expect(res.body.birthday).toBe('1995-03-21');
    const id = res.body.id as string;
    for (const birthday of ['2099-01-01', '1995-02-30', '21/03/1995']) {
      await http()
        .patch(`/api/admin/credits/customers/${id}`)
        .set(A())
        .send({ birthday })
        .expect(400);
    }
    const cleared = await http()
      .patch(`/api/admin/credits/customers/${id}`)
      .set(A())
      .send({ birthday: null })
      .expect(200);
    expect(cleared.body.birthday).toBeNull();
  });

  it('el botón "Comprar al crédito" de la tienda empieza apagado y la dueña lo activa', async () => {
    const store = async () =>
      (await http().get(`/api/public/stores/cred-a-${tag}`).expect(200)).body
        .store as { creditRequests: boolean };
    expect((await store()).creditRequests).toBe(false);
    const saved = await http()
      .patch('/api/admin/settings')
      .set(A())
      .send({ creditRequests: true })
      .expect(200);
    expect(saved.body.creditRequests).toBe(true);
    expect((await store()).creditRequests).toBe(true);
  });

  it('reportes y resumen incluyen las ventas al crédito', async () => {
    const report = await http().get('/api/admin/reports').set(A()).expect(200);
    expect(report.body.credits).toMatchObject({
      salesCount: expect.any(Number),
      soldTotal: expect.any(String),
      collected: expect.any(String),
      receivable: expect.any(String),
    });
    expect(report.body.credits.salesCount).toBeGreaterThan(0);
    expect(Array.isArray(report.body.credits.topProducts)).toBe(true);
    // Los checkouts nunca pagados no cuentan como pedidos.
    expect(
      (report.body.ordersByStatus as { status: string }[]).some(
        (s) => s.status === 'expired',
      ),
    ).toBe(false);

    const dashboard = await http()
      .get('/api/admin/dashboard')
      .set(A())
      .expect(200);
    expect(dashboard.body.credits).toMatchObject({
      receivable: expect.any(String),
      customersWithDebt: expect.any(Number),
    });
  });

  it('el historial de stock indica canal y clienta de cada venta al crédito', async () => {
    const res = await http()
      .get('/api/admin/inventory/movements?channel=credito&limit=50')
      .set(A())
      .expect(200);
    const items = res.body.items as {
      channel: string;
      code: string | null;
      customerName: string | null;
    }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((m) => m.channel === 'credito')).toBe(true);
    expect(items.every((m) => m.code?.startsWith('CR-'))).toBe(true);
    expect(items.every((m) => Boolean(m.customerName))).toBe(true);
  });
});
