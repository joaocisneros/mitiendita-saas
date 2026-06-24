import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { slugify } from '../common/utils/slug.util';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async create(companyId: string, dto: CreateCategoryDto) {
    const slug = await this.uniqueSlug(companyId, slugify(dto.name));
    return this.prisma.category.create({
      data: {
        companyId,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /** Lista las categorías vivas de la empresa, ordenadas. */
  findAll(companyId: string) {
    return this.prisma.category.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(companyId: string, id: string) {
    // El filtro por companyId garantiza que la empresa A no vea datos de la B.
    const category = await this.prisma.category.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada.');
    return category;
  }

  async update(companyId: string, id: string, dto: UpdateCategoryDto) {
    const current = await this.findOne(companyId, id); // valida pertenencia
    const data: Record<string, unknown> = { ...dto };
    if (dto.name) {
      data.slug = await this.uniqueSlug(companyId, slugify(dto.name), id);
    }
    const updated = await this.prisma.category.update({ where: { id }, data });
    if (dto.imageUrl !== undefined && current.imageUrl && current.imageUrl !== dto.imageUrl) {
      void this.media.deleteByUrl(current.imageUrl);
    }
    return updated;
  }

  /** Eliminación lógica. Libera el slug renombrándolo para poder reutilizarlo. */
  async remove(companyId: string, id: string) {
    const category = await this.findOne(companyId, id);
    await this.prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        slug: `${category.slug}--del-${Date.now()}`,
      },
    });
    void this.media.deleteByUrl(category.imageUrl);
    return { ok: true };
  }

  /**
   * Devuelve un slug único dentro de la empresa (entre categorías vivas).
   * Si "bebidas" existe, prueba "bebidas-2", "bebidas-3", etc.
   */
  private async uniqueSlug(
    companyId: string,
    base: string,
    excludeId?: string,
  ): Promise<string> {
    const safeBase = base || 'categoria';
    let candidate = safeBase;
    let n = 1;
    while (true) {
      const clash = await this.prisma.category.findFirst({
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
