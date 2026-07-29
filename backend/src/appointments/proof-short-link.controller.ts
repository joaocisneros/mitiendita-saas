import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AppointmentsService } from './appointments.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Link corto de la foto del adelanto de una cita: /api/ad/:code → muestra la
 * foto con vista previa para WhatsApp (mismo patrón que /c y /s).
 */
@Public()
@Controller('ad')
export class AppointmentProofShortLinkController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':code')
  async redirectToProof(@Param('code') code: string, @Res() res: Response) {
    const url = await this.appointments.getProofUrlByCode(code);
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
    const title = `Comprobante de adelanto — ${cleanCode}`;
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="Comprobante de adelanto de la cita ${cleanCode}">
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
