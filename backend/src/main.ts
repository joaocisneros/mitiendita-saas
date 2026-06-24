import 'dotenv/config'; // Carga el archivo .env ANTES de validar los secretos.
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * En producción NO se permite arrancar con secretos débiles o ausentes.
 * Evita que un despliegue mal configurado quede con tokens falsificables.
 */
function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const weak = new Set(['', 'change-me', 'pon_aqui_un_secreto_fuerte', 'pon_aqui_otro_secreto_fuerte']);
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    const value = process.env[key] ?? '';
    if (weak.has(value) || value.length < 16) {
      throw new Error(
        `Configuración insegura: ${key} no está definido o es demasiado débil. ` +
          `Define un valor largo y aleatorio antes de arrancar en producción.`,
      );
    }
  }
}

async function bootstrap() {
  assertProductionSecrets();
  const app = await NestFactory.create(AppModule);

  // Todas las rutas bajo /api
  app.setGlobalPrefix('api');

  // Validación estricta de DTOs + protección contra asignación masiva.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina campos no declarados
      forbidNonWhitelisted: true, // rechaza si llegan campos extra
      transform: true, // convierte tipos automáticamente
    }),
  );

  // CORS: en desarrollo permitimos los subdominios y la red local.
  // En producción agregamos los dominios reales desde CORS_ORIGINS
  // (lista separada por comas, ej: "https://mitienda.vercel.app,https://www.midominio.com").
  const prodOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: [
      ...prodOrigins,
      /\.mitiendita\.localhost(:\d+)?$/,
      /^http:\/\/localhost(:\d+)?$/,
      // Permitir acceso desde la red local (probar en el celular por WiFi).
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
    ],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 8300);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 MiTiendita API escuchando en http://localhost:${port}/api`);
}
void bootstrap();
