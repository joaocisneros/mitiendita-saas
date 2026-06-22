import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slug.util';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateProductDto) {
    await this.assertCategory(companyId, dto.categoryId);
    await this.assertSkuFree(companyId, dto.sku);
    const slug = await this.uniqueSlug(companyId, slugify(dto.name));

    return this.prisma.product.create({
      data: {
        companyId,
        categoryId: dto.categoryId ?? null,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        price: dto.price,
        stock: dto.stock,
        sku: dto.sku ?? null,
        imageUrl: dto.imageUrl ?? null,
        isFeatured: dto.isFeatured ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /** Listado paginado del panel, con búsqueda y filtros. */
  async findAll(companyId: string, q: QueryProductsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const where = {
      companyId,
      deletedAt: null,
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.isActive !== undefined ? { isActive: q.isActive === 'true' } : {}),
      ...(q.search
        ? { name: { contains: q.search } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Producto no encontrado.');
    return product;
  }

  async update(companyId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(companyId, id); // valida pertenencia

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.assertCategory(companyId, dto.categoryId);
    }
    if (dto.sku !== undefined) {
      await this.assertSkuFree(companyId, dto.sku, id);
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.name) {
      data.slug = await this.uniqueSlug(companyId, slugify(dto.name), id);
    }
    return this.prisma.product.update({ where: { id }, data });
  }

  /** Eliminación lógica. Libera slug y SKU para poder reutilizarlos. */
  async remove(companyId: string, id: string) {
    const product = await this.findOne(companyId, id);
    await this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        slug: `${product.slug}--del-${Date.now()}`,
        sku: product.sku ? `${product.sku}--del-${Date.now()}` : null,
      },
    });
    return { ok: true };
  }

  // ───────────────────── helpers ─────────────────────

  private async assertCategory(companyId: string, categoryId?: string | null) {
    if (!categoryId) return;
    const cat = await this.prisma.category.findFirst({
      where: { id: categoryId, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!cat) {
      throw new BadRequestException('La categoría no existe en tu empresa.');
    }
  }

  private async assertSkuFree(
    companyId: string,
    sku?: string | null,
    excludeId?: string,
  ) {
    if (!sku) return;
    const clash = await this.prisma.product.findFirst({
      where: {
        companyId,
        sku,
        deletedAt: null,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException('Ya existe un producto con ese SKU.');
    }
  }

  private async uniqueSlug(
    companyId: string,
    base: string,
    excludeId?: string,
  ): Promise<string> {
    const safeBase = base || 'producto';
    let candidate = safeBase;
    let n = 1;
    while (true) {
      const clash = await this.prisma.product.findFirst({
        where: {
          companyId,
          slug: candidate,
          deletedAt: null,
          NOT: excludeId ? { id: excludeId } : undefined,
        },
        select: { id: true },
      });
      if (!clash) return candidate;
      n += 1;
      candidate = `${safeBase}-${n}`;
    }
  }
}
