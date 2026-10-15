import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD antes de ejecutar la recuperación.',
    );
  }
  if (password.length < 12) {
    throw new Error('SUPERADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }

  const prisma = new PrismaService();
  try {
    const admin = await prisma.superAdmin.findUnique({ where: { email } });
    if (!admin) {
      throw new Error('No existe un superadministrador con ese correo.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.superAdmin.update({
      where: { id: admin.id },
      data: { passwordHash, isActive: true },
    });
    console.log(`Contraseña restablecida correctamente para ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Falló la recuperación.',
  );
  process.exitCode = 1;
});
