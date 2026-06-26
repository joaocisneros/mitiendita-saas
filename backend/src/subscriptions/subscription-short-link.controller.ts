import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Link corto del comprobante de planes/suscripciones:
 * /api/s/MS-ABC123 → muestra la foto con vista previa para WhatsApp.
 */
@Public()
@Controller('s')
export class SubscriptionShortLinkController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':code')
  async redirectToProof(@Param('code') code: string, @Res() res: Response) {
    const url = await this.subscriptions.getProofUrlByCode(code);
    if (!url) {
      res.status(404).type('html').send(this.notFoundPage());
      return;
    }
    res.type('html').send(this.proofPage(code, url));
  }

  private proofPage(code: string, imageUrl: string): string {
    const safe = (s: string) => s.replace(/"/g, '%22').replace(/</g, '%3C');
    const cleanCode = code.replace(/[<>"]/g, '');
    const img = safe(imageUrl);
    const title = `Comprobante de pago — ${cleanCode}`;
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="Comprobante de pago del plan ${cleanCode}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:image" content="${img}">
</head>
<body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh">
<img src="${img}" alt="Comprobante ${cleanCode}" style="max-width:100%;max-height:100vh;object-fit:contain">
</body>
</html>`;
  }

  private notFoundPage(): string {
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>No encontrado</title></head><body style="font-family:sans-serif;text-align:center;padding:3rem;color:#334155">Comprobante no encontrado.</body></html>`;
  }
}
