import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Datos PÚBLICOS de una tienda (catálogo para compradores).
 * No requiere autenticación. Resuelve la empresa por su subdominio
 * y solo expone productos/categorías activos de tiendas activas.
 */
@Injectable()
export class StorefrontService {
  constructor(private readonly prisma: PrismaService) {}

  async seoIndex() {
    const rows = await this.prisma.company.findMany({
      where: {
        status: 'active',
        deletedAt: null,
        settings: { searchVisible: true },
        NOT: [
          { subdomain: { startsWith: 'demo-' } },
          { subdomain: { startsWith: 'tienda-a-' } },
          { subdomain: { startsWith: 'tienda-b-' } },
          { subdomain: { startsWith: 'tienda-ord-' } },
          { subdomain: { startsWith: 'adm-' } },
          { subdomain: { startsWith: 'sa-' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        subdomain: true,
        updatedAt: true,
        // Para el sitemap: Google llega a cada producto aunque la tienda
        // lo abra en una ventana. Tope por tienda para no inflar el sitemap.
        products: {
          where: { isActive: true, deletedAt: null },
          orderBy: { updatedAt: 'desc' },
          take: 500,
          select: { slug: true, updatedAt: true },
        },
      },
    });
    return rows.map((row) => ({
      subdomain: row.subdomain,
      updatedAt: row.updatedAt,
      products: row.products,
    }));
  }

  /** Información de marca + categorías activas de la tienda. */
  async getStore(subdomain: string) {
    const company = await this.resolveActiveCompany(subdomain);
    const categories = await this.prisma.category.findMany({
      where: { companyId: company.id, deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, imageUrl: true },
    });

    const s = company.settings;
    return {
      store: {
        name: s?.storeName ?? company.name,
        description: s?.description ?? null,
        businessType: s?.businessType ?? null,
        logoUrl: s?.logoUrl ?? null,
        primaryColor: s?.primaryColor ?? '#2563eb',
        secondaryColor: s?.secondaryColor ?? '#f59e0b',
        currency: s?.currency ?? 'PEN',
        whatsappNumber: s?.whatsappNumber ?? null,
        allowsPickup: s?.allowsPickup ?? true,
        allowsDelivery: s?.allowsDelivery ?? true,
        deliveryFee: s?.deliveryFee ?? 0,
        minOrder: s?.minOrder ?? null,
        storeAddress: s?.storeAddress ?? null,
        // Datos de pago Yape (para la pantalla de pago).
        yapeQrUrl: s?.yapeQrUrl ?? null,
        yapeHolderName: s?.yapeHolderName ?? null,
        yapeNumber: s?.yapeNumber ?? null,
        // Datos de pago Plin (medio de pago alternativo).
        plinQrUrl: s?.plinQrUrl ?? null,
        plinHolderName: s?.plinHolderName ?? null,
        plinNumber: s?.plinNumber ?? null,
        // Presencia / confianza.
        hours: s?.hours ?? null,
        instagramUrl: s?.instagramUrl ?? null,
        facebookUrl: s?.facebookUrl ?? null,
        tiktokUrl: s?.tiktokUrl ?? null,
        searchVisible: s?.searchVisible ?? true,
        seoTitle: s?.seoTitle ?? null,
        seoDescription: s?.seoDescription ?? null,
        socialImageUrl: s?.socialImageUrl ?? null,
      },
      categories,
    };
  }

  /** Catálogo público: solo productos activos. */
  async listProducts(
    subdomain: string,
    opts: {
      categorySlug?: string;
      search?: string;
      page?: number;
      limit?: number;
      sort?: string;
    },
  ) {
    const company = await this.resolveActiveCompany(subdomain);
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 24;

    const where = {
      companyId: company.id,
      deletedAt: null,
      isActive: true,
      ...(opts.categorySlug
        ? { category: { slug: opts.categorySlug, isActive: true } }
        : {}),
      ...(opts.search ? { name: { contains: opts.search } } : {}),
    };

    const ORDER: Record<string, Record<string, 'asc' | 'desc'>[]> = {
      featured: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      price_asc: [{ price: 'asc' }],
      price_desc: [{ price: 'desc' }],
      newest: [{ createdAt: 'desc' }],
      name: [{ name: 'asc' }],
    };
    const orderBy = ORDER[opts.sort ?? 'featured'] ?? ORDER.featured;

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          stock: true,
          reserved: true,
          imageUrl: true,
          images: true,
          brand: true,
          material: true,
          sizeGuide: true,
          sizes: true,
          colors: true,
          variantStocks: true,
          reservationPaymentMode: true,
          reservationAdvanceType: true,
          reservationAdvanceValue: true,
          isFeatured: true,
          category: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map((p) => this.toPublicProduct(p)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /** Detalle público de un producto por su slug. */
  async getProduct(subdomain: string, slug: string) {
    const company = await this.resolveActiveCompany(subdomain);
    const product = await this.prisma.product.findFirst({
      where: {
        companyId: company.id,
        slug,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        stock: true,
        reserved: true,
        imageUrl: true,
        images: true,
        brand: true,
        material: true,
        sizeGuide: true,
        sizes: true,
        colors: true,
        variantStocks: true,
        reservationPaymentMode: true,
        reservationAdvanceType: true,
        reservationAdvanceValue: true,
        isFeatured: true,
        category: { select: { name: true, slug: true } },
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado.');
    return this.toPublicProduct(product);
  }

  // ───────────────────── helpers ─────────────────────

  private async resolveActiveCompany(subdomain: string) {
    const company = await this.prisma.company.findFirst({
      where: { subdomain, deletedAt: null },
      include: { settings: true },
    });
    if (!company) throw new NotFoundException('Tienda no encontrada.');
    if (company.status !== 'active') {
      throw new ForbiddenException('Esta tienda no está disponible.');
    }
    return company;
  }

  /** Expone "disponibilidad" sin revelar el stock interno exacto. */
  private toPublicProduct<
    T extends {
      stock: number;
      reserved: number;
      price: { toString(): string };
      reservationAdvanceValue?: { toString(): string } | null;
    },
  >(p: T) {
    const available = Math.max(0, p.stock - p.reserved);
    const { stock: _s, reserved: _r, ...rest } = p;
    return {
      ...rest,
      price: p.price.toString(),
      reservationAdvanceValue:
        p.reservationAdvanceValue != null
          ? p.reservationAdvanceValue.toString()
          : undefined,
      available,
      inStock: available > 0,
      // Sin unidades libres pero con stock: está apartado en un pedido sin pagar
      // y vuelve si no lo pagan (no es "agotado").
      onHold: available === 0 && p.stock > 0,
    };
  }
}
