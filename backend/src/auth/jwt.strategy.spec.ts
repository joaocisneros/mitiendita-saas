import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const config = {
    get: jest.fn().mockReturnValue('test-only-access-secret'),
  } as unknown as ConfigService;

  function strategy(overrides: { membership?: unknown; admin?: unknown }) {
    const prisma = {
      membership: {
        findUnique: jest.fn().mockResolvedValue(overrides.membership ?? null),
      },
      superAdmin: {
        findFirst: jest.fn().mockResolvedValue(overrides.admin ?? null),
      },
    } as unknown as PrismaService;
    return new JwtStrategy(config, prisma);
  }

  it('acepta una membresía activa y usa el rol actual de la base', async () => {
    const jwt = strategy({
      membership: {
        role: 'EMPLOYEE',
        user: { email: 'user@example.com', isActive: true },
        company: { status: 'active', deletedAt: null },
      },
    });

    await expect(
      jwt.validate({
        sub: 'user-1',
        email: 'user@example.com',
        companyId: 'company-1',
        role: 'OWNER',
      }),
    ).resolves.toMatchObject({ role: 'EMPLOYEE', companyId: 'company-1' });
  });

  it('rechaza sesiones de empresas suspendidas', async () => {
    const jwt = strategy({
      membership: {
        role: 'OWNER',
        user: { email: 'user@example.com', isActive: true },
        company: { status: 'suspended', deletedAt: null },
      },
    });

    await expect(
      jwt.validate({
        sub: 'user-1',
        email: 'user@example.com',
        companyId: 'company-1',
        role: 'OWNER',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un superadministrador desactivado', async () => {
    const jwt = strategy({ admin: null });

    await expect(
      jwt.validate({
        sub: 'admin-1',
        email: 'admin@example.com',
        scope: 'super',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
