import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SaAuthService } from './sa-auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('SaAuthService', () => {
  const admin = {
    id: 'admin-1',
    name: 'Super Administrador',
    email: 'admin@example.com',
    passwordHash: 'hash-anterior',
    isActive: true,
  };

  function createService(
    envPassword = 'NuevaClaveSegura123',
    recovery = 'true',
  ) {
    const prisma = {
      superAdmin: {
        findUnique: jest.fn().mockResolvedValue(admin),
        update: jest.fn().mockResolvedValue(admin),
      },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('token-seguro') };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'SUPERADMIN_EMAIL') return admin.email;
        if (key === 'SUPERADMIN_PASSWORD') return envPassword;
        if (key === 'SUPERADMIN_RECOVERY') return recovery;
        if (key === 'JWT_ACCESS_SECRET') return 'jwt-secret';
        return undefined;
      }),
    };
    return {
      service: new SaAuthService(
        prisma as never,
        jwt as never,
        config as never,
      ),
      prisma,
      jwt,
    };
  }

  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('entra normalmente con la contraseña guardada', async () => {
    const { service, prisma } = createService('NuevaClaveSegura123', 'false');
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login(admin.email, 'MiClaveDelPanel');
    expect(result.accessToken).toBe('token-seguro');
    expect(prisma.superAdmin.update).not.toHaveBeenCalled();
  });

  it('con SUPERADMIN_RECOVERY=true repara el hash con la llave de emergencia', async () => {
    const { service, prisma, jwt } = createService();
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);
    jest.mocked(bcrypt.hash).mockResolvedValue('hash-nuevo' as never);

    const result = await service.login(
      ' ADMIN@example.com ',
      'NuevaClaveSegura123',
    );

    expect(prisma.superAdmin.update).toHaveBeenCalledWith({
      where: { id: admin.id },
      data: { passwordHash: 'hash-nuevo', isActive: true },
    });
    expect(jwt.signAsync).toHaveBeenCalled();
    expect(result.accessToken).toBe('token-seguro');
  });

  it('sin SUPERADMIN_RECOVERY la contraseña del servidor NO sirve de puerta trasera', async () => {
    const { service, prisma } = createService('NuevaClaveSegura123', 'false');
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login(admin.email, 'NuevaClaveSegura123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.superAdmin.update).not.toHaveBeenCalled();
  });

  it('una contraseña débil del servidor no se acepta ni con la recuperación activa', async () => {
    const { service, prisma } = createService('Admin12345', 'true');
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login(admin.email, 'Admin12345'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.superAdmin.update).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña que tampoco coincide con el secreto privado', async () => {
    const { service, prisma } = createService();
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login(admin.email, 'ContraseñaEquivocada'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.superAdmin.update).not.toHaveBeenCalled();
  });
});
