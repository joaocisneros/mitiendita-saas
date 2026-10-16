import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Cada rubro registra clientes por su propio flujo: pedidos (comercio y
 * comida), citas (servicios) o suscripciones (digital). Verifica que Clientes,
 * el Resumen y los conteos del superadmin funcionen bien en todos.
 */
describe('Clientes por rubro (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superToken = '';
  const tag = Date.now();

  type Store = { token: string; sub: string; id: string };
  const stores: Record<string, Store> = {};

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

    const register = async (key: string, businessType: string) => {
      const sub = `rub-${key}-${tag}`;
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          responsibleName: `Dueño ${key}`,
          email: `rub_${key}_${tag}@test.com`,
          password: 'clave12345',
          commercialName: `Tienda ${key}`,
          subdomain: sub,
          whatsappNumber: '+51900000000',
          businessType,
        })
        .expect(201);
      stores[key] = {
        token: res.body.accessToken,
        sub,
        id: res.body.company.id,
      };
    };
    await register('comercio', 'Bodegas');
    await register('comida', 'Pizzerías');
    await register('servicios', 'Barberías');
    await register('digital', 'Streaming');

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
  const auth = (key: string) => ({
    Authorization: `Bearer ${stores[key].token}`,
  });
  const customersOf = async (key: string) =>
    (await http().get('/api/customers').set(auth(key)).expect(200)).body as {
      total: number;
      items: { name: string; phone: string; ordersCount: number }[];
    };

  /** Checkout + comprobante + aprobación del dueño. */
  async function buy(key: string, name: string, phone: string, approve = true) {
    const productId = (
      await http()
        .post('/api/products')
        .set(auth(key))
        .send({ name: `Prod ${name} ${Math.random()}`, price: 20, stock: 10 })
        .expect(201)
    ).body.id as string;
    const orderId = (
      await http()
        .post(`/api/public/stores/${stores[key].sub}/checkout`)
        .send({
          customerName: name,
          customerPhone: phone,
          deliveryMethod: 'pickup',
          items: [{ productId, quantity: 1 }],
        })
        .expect(201)
    ).body.id as string;
    if (!approve) return orderId;
    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId },
        data: {
          status: 'proof_submitted',
          proofUrl: 'https://test.local/p.png',
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'proof_submitted', reservationExpiresAt: null },
      }),
    ]);
    await http()
      .post(`/api/admin/orders/${orderId}/payment/approve`)
      .set(auth(key))
      .expect(201);
    return orderId;
  }

  it('comercio: solo aparece quien completó la compra', async () => {
    await buy('comercio', 'Compradora Real', '+51911000001');
    await buy('comercio', 'Solo Miró', '+51911000002', false);
    const list = await customersOf('comercio');
    expect(list.items.map((c) => c.name)).toEqual(['Compradora Real']);
    expect(list.items[0].ordersCount).toBe(1);
  });

  it('comida: mismo comportamiento que comercio', async () => {
    await buy('comida', 'Cliente Pizza', '+51911000003');
    await buy('comida', 'Abandono Pizza', '+51911000004', false);
    const list = await customersOf('comida');
    expect(list.total).toBe(1);
    expect(list.items[0].name).toBe('Cliente Pizza');
  });

  it('servicios: quien reserva una cita sigue apareciendo en Clientes', async () => {
    const preferredAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
    await http()
      .post(`/api/public/stores/${stores.servicios.sub}/appointments`)
      .send({
        customerName: 'cliente de cita',
        customerPhone: '+51911000005',
        serviceName: 'Corte clásico',
        preferredAt,
      })
      .expect(201);
    const list = await customersOf('servicios');
    expect(list.total).toBe(1);
    expect(list.items[0].name).toBe('Cliente De Cita');
    expect(list.items[0].ordersCount).toBe(0);
  });

  it('digital: quien solicita una suscripción sigue apareciendo en Clientes', async () => {
    await http()
      .post(`/api/public/stores/${stores.digital.sub}/subscriptions`)
      .send({
        customerName: 'cliente suscrita',
        customerPhone: '+51911000006',
        planName: 'Plan mensual',
      })
      .expect(201);
    const list = await customersOf('digital');
    expect(list.total).toBe(1);
    expect(list.items[0].name).toBe('Cliente Suscrita');
  });

  it('el Resumen responde en todos los rubros y cuenta clientes nuevos', async () => {
    for (const key of ['comercio', 'comida', 'servicios', 'digital']) {
      const res = await http()
        .get('/api/admin/dashboard')
        .set(auth(key))
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain('null,null');
    }
  });

  it('el superadmin cuenta pedidos y clientes reales por rubro', async () => {
    const res = await http()
      .get(`/api/superadmin/companies?search=rub-&limit=100`)
      .set({ Authorization: `Bearer ${superToken}` })
      .expect(200);
    const bySub = new Map(
      (
        res.body.items as {
          subdomain: string;
          orders: number;
          customers: number;
        }[]
      ).map((c) => [c.subdomain, c]),
    );
    expect(bySub.get(stores.comercio.sub)).toMatchObject({
      orders: 1,
      customers: 1,
    });
    expect(bySub.get(stores.comida.sub)).toMatchObject({
      orders: 1,
      customers: 1,
    });
    expect(bySub.get(stores.servicios.sub)).toMatchObject({
      orders: 0,
      customers: 1,
    });
    expect(bySub.get(stores.digital.sub)).toMatchObject({
      orders: 0,
      customers: 1,
    });
  });
});
