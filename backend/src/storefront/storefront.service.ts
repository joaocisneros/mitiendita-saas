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
        logoUrl: s?.logoUrl ?? null,
        primaryColor: s?.primaryColor ?? '#2563eb',
        secondaryColor: s?.secondaryColor ?? '#f59e0b',
        currency: s?.currency ?? 'PEN',
        whatsappNumber: s?.whatsappNumber ?? null,
        allowsPickup: s?.allowsPickup ?? true,
        allowsDelivery: s?.allowsDelivery ?? true,
        deliveryFee: s?.deliveryFee ?? 0,
      },
      categories,
    };
  }

  /** Catálogo público: solo productos activos. */
  async listProducts(
    subdomain: string,
    opts: { categorySlug?: string; search?: string; page?: number; limit?: number },
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

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          stock: true,
          reserved: true,
          imageUrl: true,
          isFeatured: true,
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
    T extends { stock: number; reserved: number; price: unknown },
  >(p: T) {
    const available = Math.max(0, p.stock - p.reserved);
    const { stock: _s, reserved: _r, ...rest } = p;
    return {
      ...rest,
      price: String(p.price),
      available,
      inStock: available > 0,
    };
  }
}
