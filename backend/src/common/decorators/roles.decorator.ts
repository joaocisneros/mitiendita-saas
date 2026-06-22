import { SetMetadata } from '@nestjs/common';
import { MembershipRole } from '../../../generated/prisma/enums';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a ciertos roles dentro de la empresa.
 *   @Roles('OWNER')
 */
export const Roles = (...roles: MembershipRole[]) =>
  SetMetadata(ROLES_KEY, roles);
