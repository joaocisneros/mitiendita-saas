import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint como público (sin autenticación).
 * Se usa en login, registro y en la tienda pública.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
