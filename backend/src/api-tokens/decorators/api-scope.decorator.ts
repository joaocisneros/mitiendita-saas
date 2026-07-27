import { SetMetadata } from '@nestjs/common';

export const API_SCOPE_KEY = 'apiScope';

/** Marca un endpoint público (/v1/...) con el módulo que un ApiToken necesita para usarlo. */
export const ApiScope = (scope: string) => SetMetadata(API_SCOPE_KEY, scope);
