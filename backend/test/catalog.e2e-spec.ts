import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Fase 2: catálogo (categorías y productos) + aislamiento entre empresas.
 * Prueba crítica: la empresa A nunca puede tocar recursos de la empresa B.
 */
describe('Catálogo y aislamiento (e2e)', () => {
  let app: INestApplication;
  const tag = Date.now();

  let tokenA = '';
  let tokenB = '';
  let categoryA = '';
  let productA = '';

  const mkCompany = (k: string) => ({
    responsibleName: `Dueño ${k}`,
    email: `${k}_${tag}@test.com`,
    password: 'clave12345',
    commercialName: `Tienda ${k}`,
    subdomain: `tienda-${k}-${tag}`,
    whatsappNumber: '+51900000009',
  });

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

    tokenA = (
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(mkCompany('a'))
    ).body.accessToken;
    tokenB = (
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(mkCompany('b'))
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  it('A crea una categoría con slug normalizado', async () => {
    const res = await http()
      .post('/api/categories')
      .set(auth(tokenA))
      .send({ name: 'Bebidas Frías' })
      .expect(201);
    expect(res.body.slug).toBe('bebidas-frias');
    categoryA = res.body.id;
  });

  it('A crea un producto en su categoría (precio exacto)', async () => {
    const res = await http()
      .post('/api/products')
      .set(auth(tokenA))
      .send({
        name: 'Agua San Luis',
        price: 1.5,
        stock: 10,
        sku: `SL-${tag}`,
        categoryId: categoryA,
      })
      .expect(201);
    expect(res.body.price).toBe('1.5');
    productA = res.body.id;
  });

  it('rechaza precio negativo y stock negativo', async () => {
    await http()
      .post('/api/products')
      .set(auth(tokenA))
      .send({ name: 'Malo', price: -1, stock: 5 })
      .expect(400);
    await http()
      .post('/api/products')
      .set(auth(tokenA))
      .send({ name: 'Malo', price: 1, stock: -5 })
      .expect(400);
  });

  it('rechaza SKU duplicado en la misma empresa', async () => {
    await http()
      .post('/api/products')
      .set(auth(tokenA))
      .send({ name: 'Otra agua', price: 2, stock: 3, sku: `SL-${tag}` })
      .expect(409);
  });

  // ───────── AISLAMIENTO ENTRE EMPRESAS ─────────

  it('B no ve las categorías de A', async () => {
    const res = await http()
      .get('/api/categories')
      .set(auth(tokenB))
      .expect(200);
    expect(res.body).toHaveLength(0);
  });

  it('B no puede ver la categoría de A por su ID', async () => {
    await http()
      .get(`/api/categories/${categoryA}`)
      .set(auth(tokenB))
      .expect(404);
  });

  it('B no puede editar el producto de A', async () => {
    await http()
      .patch(`/api/products/${productA}`)
      .set(auth(tokenB))
      .send({ price: 0.01 })
      .expect(404);
  });

  it('B no puede usar la categoría de A al crear un producto', async () => {
    await http()
      .post('/api/products')
      .set(auth(tokenB))
      .send({ name: 'Intruso', price: 5, stock: 1, categoryId: categoryA })
      .expect(400);
  });

  it('el producto de A sigue intacto', async () => {
    const res = await http()
      .get(`/api/products/${productA}`)
      .set(auth(tokenA))
      .expect(200);
    expect(res.body.price).toBe('1.5');
  });

  it('permite reutilizar el SKU tras eliminar (lógico) el producto', async () => {
    await http()
      .delete(`/api/products/${productA}`)
      .set(auth(tokenA))
      .expect(200);
    // El SKU queda libre de nuevo.
    await http()
      .post('/api/products')
      .set(auth(tokenA))
      .send({ name: 'Agua nueva', price: 1.5, stock: 5, sku: `SL-${tag}` })
      .expect(201);
  });
});
