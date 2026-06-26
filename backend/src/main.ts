import 'dotenv/config';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * En producción NO se permite arrancar con secretos débiles o ausentes.
 * Evita que un despliegue mal configurado quede con tokens falsificables.
 */
function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const weak = new Set([
    '',
    'change-me',
    'pon_aqui_un_secreto_fuerte',
    'pon_aqui_otro_secreto_fuerte',
  ]);
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    const value = process.env[key] ?? '';
    if (weak.has(value) || value.length < 16) {
      throw new Error(
        `Configuración insegura: ${key} no está definido o es demasiado débil. ` +
          'Define un valor largo y aleatorio antes de arrancar en producción.',
      );
    }
  }
}

const FIELD_LABELS: Record<string, string> = {
  responsibleName: 'nombre del responsable',
  commercialName: 'nombre comercial',
  storeName: 'nombre de la tienda',
  customerName: 'nombre del cliente',
  customerPhone: 'teléfono del cliente',
  whatsappNumber: 'WhatsApp',
  phone: 'teléfono',
  email: 'correo',
  password: 'contraseña',
  refreshToken: 'token de sesión',
  subdomain: 'subdominio',
  businessType: 'rubro',
  planName: 'plan',
  serviceName: 'servicio',
  productId: 'producto',
  categoryId: 'categoría',
  name: 'nombre',
  slug: 'slug',
  description: 'descripción',
  price: 'precio',
  stock: 'stock',
  sku: 'SKU',
  imageUrl: 'imagen',
  logoUrl: 'logo',
  yapeQrUrl: 'QR de Yape',
  yapeHolderName: 'titular de Yape',
  yapeNumber: 'número de Yape',
  storeAddress: 'dirección',
  deliveryFee: 'costo de entrega',
  minOrder: 'pedido mínimo',
  note: 'nota',
  address: 'dirección',
  reference: 'referencia',
  status: 'estado',
  action: 'acción',
  startsAt: 'fecha de inicio',
  endsAt: 'fecha de vencimiento',
  currentPeriodEndsAt: 'fecha de vencimiento',
  preferredAt: 'fecha preferida',
  planId: 'plan inicial',
  months: 'meses',
  maxProducts: 'límite de productos',
  maxUsers: 'límite de usuarios',
};

function fieldLabel(property: string): string {
  return FIELD_LABELS[property] ?? property;
}

function numberFrom(message: string): string | null {
  return message.match(/\d+/)?.[0] ?? null;
}

function translateConstraint(
  property: string,
  constraint: string,
  original: string,
): string {
  const label = fieldLabel(property);
  const n = numberFrom(original);
  switch (constraint) {
    case 'isDefined':
    case 'isNotEmpty':
      return `El campo ${label} es obligatorio.`;
    case 'isString':
      return `El campo ${label} debe ser texto.`;
    case 'isEmail':
      return 'Ingresa un correo válido.';
    case 'minLength':
      return `El campo ${label} debe tener al menos ${n ?? 'los'} caracteres.`;
    case 'maxLength':
      return `El campo ${label} no debe superar ${n ?? 'el límite de'} caracteres.`;
    case 'isUUID':
      return `El campo ${label} no tiene un formato válido.`;
    case 'isEnum':
      return `El campo ${label} tiene un valor no permitido.`;
    case 'isBoolean':
      return `El campo ${label} debe ser verdadero o falso.`;
    case 'isNumber':
      return `El campo ${label} debe ser un número.`;
    case 'isInt':
      return `El campo ${label} debe ser un número entero.`;
    case 'min':
      return `El campo ${label} debe ser mayor o igual a ${n ?? 'lo permitido'}.`;
    case 'max':
      return `El campo ${label} debe ser menor o igual a ${n ?? 'lo permitido'}.`;
    case 'matches':
      return `El campo ${label} tiene un formato inválido.`;
    case 'isUrl':
      return `El campo ${label} debe ser una URL válida.`;
    case 'isDateString':
      return `El campo ${label} debe ser una fecha válida.`;
    case 'whitelistValidation':
      return `El campo ${label} no está permitido.`;
    default:
      return original
        .replace(`${property} must be longer than or equal to`, `El campo ${label} debe tener al menos`)
        .replace(`${property} must be shorter than or equal to`, `El campo ${label} no debe superar`)
        .replace(`${property} must be an email`, 'Ingresa un correo válido')
        .replace(`${property} should not be empty`, `El campo ${label} es obligatorio`)
        .replace(`${property} must be a string`, `El campo ${label} debe ser texto`)
        .replace(`${property} must be a number`, `El campo ${label} debe ser un número`)
        .replace('characters', 'caracteres');
  }
}

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const own = error.constraints
      ? Object.entries(error.constraints).map(([constraint, message]) =>
          translateConstraint(error.property, constraint, message),
        )
      : [];
    const nested = error.children?.length
      ? flattenValidationErrors(error.children)
      : [];
    return [...own, ...nested];
  });
}

async function bootstrap() {
  assertProductionSecrets();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = flattenValidationErrors(errors);
        return new BadRequestException({
          message:
            messages[0] ?? 'Datos inválidos. Revisa la información ingresada.',
          errors: messages,
        });
      },
    }),
  );

  const prodOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: [
      ...prodOrigins,
      /\.mitiendita\.localhost(:\d+)?$/,
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
    ],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 8300);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`MiTiendita API escuchando en http://localhost:${port}/api`);
}
void bootstrap();
