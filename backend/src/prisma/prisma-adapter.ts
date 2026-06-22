import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * Construye el driver adapter de MySQL/MariaDB a partir de DATABASE_URL.
 * Prisma 7 exige un adapter para la conexión en tiempo de ejecución.
 */
export function createMysqlAdapter(databaseUrl: string): PrismaMariaDb {
  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 10,
  });
}
