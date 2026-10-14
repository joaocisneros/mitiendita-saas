import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ApiTokenContext } from '../guards/api-token.guard';

/** Inyecta el contexto del ApiToken validado por ApiTokenGuard. */
export const CurrentApiToken = createParamDecorator(
  (data: keyof ApiTokenContext | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ apiToken?: ApiTokenContext }>();
    const apiToken = request.apiToken;
    return data ? apiToken?.[data] : apiToken;
  },
);
