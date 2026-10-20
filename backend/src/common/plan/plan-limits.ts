import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../decorators/current-user.decorator';

/** Funciones que se activan o bloquean según el plan de la empresa. */
export type PlanFeature = 'excel' | 'credits' | 'seo';

/** Lo que permite el plan. Sin plan asignado: todo permitido (como antes). */
export interface PlanLimits {
  planName: string | null;
  maxImages: number;
  excel: boolean;
  credits: boolean;
  seo: boolean;
}

export const MAX_IMAGES_CAP = 12;

const FEATURE_LABEL: Record<PlanFeature, string> = {
  excel: 'el Excel de reportes',
  credits: 'las ventas al crédito',
  seo: 'el título y la descripción para Google',
};

/** Lee el plan actual de la empresa (se respeta al instante si el superadmin lo cambia). */
export async function planLimitsOf(
  prisma: PrismaService,
  companyId: string,
): Promise<PlanLimits> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      plan: {
        select: {
          name: true,
          maxImages: true,
          featExcel: true,
          featCredits: true,
          featSeo: true,
        },
      },
    },
  });
  const plan = company?.plan;
  return {
    planName: plan?.name ?? null,
    maxImages: Math.min(plan?.maxImages ?? MAX_IMAGES_CAP, MAX_IMAGES_CAP),
    excel: plan?.featExcel ?? true,
    credits: plan?.featCredits ?? true,
    seo: plan?.featSeo ?? true,
  };
}

export function planFeatureError(
  feature: PlanFeature,
  planName: string | null,
) {
  return new ForbiddenException(
    `Tu plan${planName ? ` ${planName}` : ''} no incluye ${FEATURE_LABEL[feature]}. Escríbenos por WhatsApp para cambiar de plan.`,
  );
}

const PLAN_FEATURE_KEY = 'planFeature';

/** Exige que el plan de la empresa incluya la función:  @RequiresPlan('credits') */
export const RequiresPlan = (feature: PlanFeature) =>
  SetMetadata(PLAN_FEATURE_KEY, feature);

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<PlanFeature | undefined>(
      PLAN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) return true;
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user?.companyId) return true; // los demás guards ya validan la sesión
    const limits = await planLimitsOf(this.prisma, user.companyId);
    if (!limits[feature]) throw planFeatureError(feature, limits.planName);
    return true;
  }
}
