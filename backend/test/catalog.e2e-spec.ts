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

  it('el índice SEO lista los productos activos de la tienda (para el sitemap)', async () => {
    const subdomain = `seo-${tag}`;
    const token = (
      await http()
        .post('/api/auth/register')
        .send({ ...mkCompany('seo'), subdomain })
        .expect(201)
    ).body.accessToken as string;
    await http()
      .post('/api/products')
      .set(auth(token))
      .send({ name: 'Polo Visible', price: 30, stock: 5 })
      .expect(201);
    const hidden = (
      await http()
        .post('/api/products')
        .set(auth(token))
        .send({ name: 'Polo Borrado', price: 30, stock: 5 })
        .expect(201)
    ).body.id as string;
    await http().delete(`/api/products/${hidden}`).set(auth(token)).expect(200);

    const res = await http().get('/api/public/stores/seo/index').expect(200);
    const store = (
      res.body as { subdomain: string; products: { slug: string }[] }[]
    ).find((s) => s.subdomain === subdomain)!;
    expect(store.products.map((p) => p.slug)).toEqual(['polo-visible']);
  });

  it('guarda categorías y productos escritos en mayúsculas con formato normal', async () => {
    const category = await http()
      .post('/api/categories')
      .set(auth(tokenA))
      .send({ name: 'PRODUCTO DE ASEOS' })
      .expect(201);
    expect(category.body.name).toBe('Producto de Aseos');
    const product = await http()
      .post('/api/products')
      .set(auth(tokenA))
      .send({ name: 'CREMA NIVEA 200ML', price: 12, stock: 3 })
      .expect(201);
    expect(product.body.name).toBe('Crema Nivea 200ML');
    const edited = await http()
      .patch(`/api/products/${product.body.id}`)
      .set(auth(tokenA))
      .send({ name: 'iPhone 15' })
      .expect(200);
    expect(edited.body.name).toBe('iPhone 15');
  });

  it('guarda el tipo de producto y rechaza uno inventado', async () => {
    const ring = await http()
      .post('/api/products')
      .set(auth(tokenA))
      .send({
        name: 'Anillo Plata',
        price: 50,
        stock: 0,
        productType: 'anillos',
        sizes: '6, 7',
        variantStocks: [
          { size: '6', stock: 2 },
          { size: '7', stock: 1 },
        ],
      })
      .expect(201);
    expect(ring.body.productType).toBe('anillos');
    expect(ring.body.stock).toBe(3);
    await http()
      .post('/api/products')
      .set(auth(tokenA))
      .send({ name: 'Raro', price: 5, stock: 1, productType: 'cohete' })
      .expect(400);
  });

  it('la tienda separa productos disponibles y agotados', async () => {
    for (const [name, stock] of [
      ['Vela Disponible', 4],
      ['Vela Agotada', 0],
    ] as const) {
      await http()
        .post('/api/products')
        .set(auth(tokenA))
        .send({ name, price: 10, stock })
        .expect(201);
    }
    const store = `tienda-a-${tag}`;
    const names = async (availability: string) =>
      (
        (
          await http()
            .get(
              `/api/public/stores/${store}/products?limit=100&availability=${availability}`,
            )
            .expect(200)
        ).body.items as { name: string }[]
      ).map((p) => p.name);
    const available = await names('available');
    const soldout = await names('soldout');
    expect(available).toContain('Vela Disponible');
    expect(available).not.toContain('Vela Agotada');
    expect(soldout).toContain('Vela Agotada');
    expect(soldout).not.toContain('Vela Disponible');
  });
});
