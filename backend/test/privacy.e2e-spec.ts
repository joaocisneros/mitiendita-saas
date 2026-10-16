import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { proofKey } from '../src/common/utils/proof-link.util';

/**
 * Privacidad y permisos: enlaces firmados del comprobante, datos a medias en
 * citas y suscripciones, y el superadmin fuera de las rutas de tienda.
 */
describe('Privacidad y permisos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken = '';
  let superToken = '';
  const tag = Date.now();
  const sub = `priv-${tag}`;

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

    ownerToken = (
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          responsibleName: 'Dueña Privacidad',
          email: `priv_${tag}@test.com`,
          password: 'clave12345',
          commercialName: 'Tienda Privacidad',
          subdomain: sub,
          whatsappNumber: '+51900000000',
          businessType: 'Barberías',
        })
    ).body.accessToken;
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

  it('#5 el superadmin no puede usar las rutas de una tienda', async () => {
    const res = await http()
      .get('/api/products')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(403);
    expect(res.body.message).toContain('modo soporte');
    // Sus propias rutas siguen funcionando.
    await http()
      .get('/api/superadmin/companies')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
  });

  it('#8 la foto del comprobante solo se ve con el enlace firmado', async () => {
    const productId = (
      await http()
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Prod Privado', price: 10, stock: 5 })
        .expect(201)
    ).body.id as string;
    const order = (
      await http()
        .post(`/api/public/stores/${sub}/checkout`)
        .send({
          customerName: 'Cliente Privado',
          customerPhone: '+51911222333',
          deliveryMethod: 'pickup',
          items: [{ productId, quantity: 1 }],
        })
        .expect(201)
    ).body as { id: string; code: string };
    await prisma.payment.update({
      where: { orderId: order.id },
      data: { proofUrl: 'https://test.local/comprobante.png' },
    });

    await http().get(`/api/c/${order.code}`).expect(404);
    await http().get(`/api/c/${order.code}?k=falsa`).expect(404);
    const ok = await http()
      .get(`/api/c/${order.code}?k=${proofKey('c', order.code)}`)
      .expect(200);
    expect(ok.text).toContain('https://test.local/comprobante.png');
    // Una firma de otro pedido no sirve.
    await http()
      .get(`/api/c/${order.code}?k=${proofKey('c', 'MT-OTRO00')}`)
      .expect(404);
  });

  it('#9 el recibo público de una cita muestra los datos a medias', async () => {
    const created = await http()
      .post(`/api/public/stores/${sub}/appointments`)
      .send({
        customerName: 'Ana María López',
        customerPhone: '+51 922 333 444',
        serviceName: 'Corte',
        preferredAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      })
      .expect(201);
    await prisma.appointment.update({
      where: { id: created.body.id },
      data: { proofUrl: 'https://test.local/adelanto.png' },
    });
    const res = await http()
      .get(`/api/public/stores/${sub}/appointments/${created.body.id}`)
      .expect(200);
    expect(res.body).toMatchObject({
      customerName: 'Ana M.',
      customerPhone: '922 *** 444',
      proofUrl: null,
      hasProof: true,
      operationNumber: null,
    });
    // El dueño sigue viendo todo en su panel.
    const panel = await http()
      .get('/api/admin/appointments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const mine = (
      panel.body as { id: string; customerPhone: string; proofUrl: string }[]
    ).find((a) => a.id === created.body.id);
    expect(mine?.customerPhone).toBe('51922333444');
    expect(mine?.proofUrl).toBe('https://test.local/adelanto.png');
  });

  it('#9 el recibo público de una suscripción muestra los datos a medias', async () => {
    const created = await http()
      .post(`/api/public/stores/${sub}/subscriptions`)
      .send({
        customerName: 'Luis Fernando Paz',
        customerPhone: '+51 933 444 555',
        planName: 'Plan mensual',
      })
      .expect(201);
    const res = await http()
      .get(`/api/public/stores/${sub}/subscriptions/${created.body.id}`)
      .expect(200);
    expect(res.body).toMatchObject({
      customerName: 'Luis F.',
      customerPhone: '933 *** 555',
      proofUrl: null,
      renewalProofUrl: null,
    });
  });
});
