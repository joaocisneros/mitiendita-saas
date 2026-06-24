import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from '../dto/plan.dto';
import { SaAuditService } from './sa-audit.service';

@Injectable()
export class SaPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SaAuditService,
  ) {}

  list() {
    return this.prisma.plan.findMany({ orderBy: { priceMonth: 'asc' } });
  }

  /** Planes activos para mostrar en la landing pública (sin datos sensibles). */
  listPublic() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonth: 'asc' },
      select: { id: true, name: true, slug: true, priceMonth: true, maxProducts: true },
    });
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-');
  }

  async create(actorId: string, dto: CreatePlanDto) {
    const slug = this.slugify(dto.slug);
    if (await this.prisma.plan.findUnique({ where: { slug } })) {
      throw new ConflictException('Ya existe un plan con ese identificador.');
    }
    const plan = await this.prisma.plan.create({
      data: { ...dto, slug, maxProducts: dto.maxProducts ?? null },
    });
    await this.audit.log(actorId, 'plan.created', undefined, { planId: plan.id });
    return plan;
  }

  async update(actorId: string, id: number, dto: UpdatePlanDto) {
    const current = await this.prisma.plan.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Plan no encontrado.');
    const slug = dto.slug ? this.slugify(dto.slug) : undefined;
    if (slug) {
      const duplicate = await this.prisma.plan.findFirst({
        where: { slug, NOT: { id } },
      });
      if (duplicate) {
        throw new ConflictException('Ya existe un plan con ese identificador.');
      }
    }
    const plan = await this.prisma.plan.update({
      where: { id },
      data: { ...dto, slug },
    });
    await this.audit.log(actorId, 'plan.updated', undefined, { planId: id });
    return plan;
  }
}
