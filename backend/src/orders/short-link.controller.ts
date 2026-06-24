import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Link corto del comprobante: /api/c/:code → redirige a la foto (Cloudinary).
 * Sirve para que el mensaje de WhatsApp lleve una URL corta y profesional
 * (ej: tutienda.pe/c/MT-AB12) en vez del enlace largo de Cloudinary.
 */
@Public()
@Controller('c')
export class ShortLinkController {
  constructor(private readonly orders: OrdersService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':code')
  async redirectToProof(@Param('code') code: string, @Res() res: Response) {
    const url = await this.orders.getProofUrlByCode(code);
    if (!url) {
      res.status(404).type('html').send(this.notFoundPage());
      return;
    }
    // Página con etiquetas Open Graph: así WhatsApp/Facebook muestran la
    // vista previa (miniatura) de la foto del comprobante. Para una persona,
    // muestra la imagen a pantalla completa.
    res.type('html').send(this.proofPage(code, url));
  }

  private proofPage(code: string, imageUrl: string): string {
    const safe = (s: string) => s.replace(/"/g, '%22').replace(/</g, '%3C');
    const img = safe(imageUrl);
    const title = `Comprobante de pago — ${code.replace(/[<>"]/g, '')}`;
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="Comprobante de pago Yape del pedido ${code}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:image" content="${img}">
</head>
<body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh">
<img src="${img}" alt="Comprobante ${code}" style="max-width:100%;max-height:100vh;object-fit:contain">
</body>
</html>`;
  }

  private notFoundPage(): string {
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>No encontrado</title></head><body style="font-family:sans-serif;text-align:center;padding:3rem;color:#334155">Comprobante no encontrado.</body></html>`;
  }
}
