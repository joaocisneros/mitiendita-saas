import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
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

  // CORS: en desarrollo permitimos los subdominios locales.
  app.enableCors({
    origin: [/\.mitiendita\.localhost(:\d+)?$/, /^http:\/\/localhost(:\d+)?$/],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 8300);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 MiTiendita API escuchando en http://localhost:${port}/api`);
}
void bootstrap();
