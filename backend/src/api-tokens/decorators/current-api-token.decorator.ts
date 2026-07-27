import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ApiTokenContext } from '../guards/api-token.guard';

/** Inyecta el contexto del ApiToken validado por ApiTokenGuard. */
export const CurrentApiToken = createParamDecorator(
  (data: keyof ApiTokenContext | undefined, ctx: ExecutionContext): ApiTokenContext | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const apiToken = request.apiToken as ApiTokenContext;
    return data ? apiToken?.[data] : apiToken;
  },
);
