import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizePhone } from '../common/utils/phone.util';

export type WhatsappNotificationResult = {
  status: 'sent' | 'disabled' | 'skipped' | 'failed';
  messageId?: string;
  reason?: string;
};

type TwilioResponse = { sid?: string; message?: string; code?: number };

/**
 * Envío de WhatsApp por la API de Twilio (un solo número de la plataforma).
 * Puede mandar texto y, opcionalmente, una imagen por URL (MediaUrl) — así
 * llega la FOTO del comprobante directo al WhatsApp del dueño.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  private get enabled(): boolean {
    return this.config.get<string>('TWILIO_ENABLED') === 'true';
  }

  private creds() {
    return {
      sid: this.config.get<string>('TWILIO_ACCOUNT_SID'),
      token: this.config.get<string>('TWILIO_AUTH_TOKEN'),
      from: this.config.get<string>('TWILIO_WHATSAPP_FROM'),
    };
  }

  private async send(
    rawTo: string | null | undefined,
    body: string,
    mediaUrl?: string,
  ): Promise<WhatsappNotificationResult> {
    if (!this.enabled) {
      return { status: 'disabled', reason: 'WhatsApp (Twilio) no está activado.' };
    }
    const digits = normalizePhone(rawTo ?? '');
    if (digits.length < 8) {
      return { status: 'skipped', reason: 'La tienda no tiene un WhatsApp válido.' };
    }
    const { sid, token, from } = this.creds();
    if (!sid || !token || !from) {
      this.logger.warn('Twilio está activado pero su configuración está incompleta.');
      return { status: 'failed', reason: 'Configuración de Twilio incompleta.' };
    }

    try {
      const params = new URLSearchParams();
      params.set('To', `whatsapp:+${digits}`);
      params.set('From', from.startsWith('whatsapp:') ? from : `whatsapp:${from}`);
      params.set('Body', body);
      if (mediaUrl) params.append('MediaUrl', mediaUrl);

      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        },
      );
      const data = (await response.json().catch(() => ({}))) as TwilioResponse;
      if (!response.ok || !data.sid) {
        throw new Error(`Twilio ${response.status}: ${data.message ?? 'respuesta inválida'}`);
      }
      return { status: 'sent', messageId: data.sid };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`No se pudo enviar el WhatsApp por Twilio: ${message}`);
      return { status: 'failed', reason: 'No se pudo enviar el WhatsApp.' };
    }
  }

  /** Aviso con la FOTO del comprobante (cuando el cliente sube su captura). */
  async sendProofNotification(input: {
    recipient: string | null | undefined;
    storeName: string;
    orderCode: string;
    customerName: string;
    total: string;
    currency: string;
    proofUrl: string;
  }): Promise<WhatsappNotificationResult> {
    const body = [
      `🧾 Nuevo comprobante — ${input.storeName}`,
      `Pedido: ${input.orderCode}`,
      `Cliente: ${input.customerName}`,
      `Total: ${input.currency} ${input.total}`,
      'Revisa y valida el pago en tu panel de MiTiendita.',
    ].join('\n');
    return this.send(input.recipient, body, input.proofUrl);
  }

  /** Aviso de texto cuando entra una reserva de servicio (cita). */
  async sendAppointmentNotification(input: {
    recipient: string | null | undefined;
    storeName: string;
    serviceName: string;
    customerName: string;
    customerPhone: string;
    preferredAt: Date;
  }): Promise<WhatsappNotificationResult> {
    const when = input.preferredAt.toLocaleString('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const body = [
      `📅 Nueva reserva — ${input.storeName}`,
      `Servicio: ${input.serviceName}`,
      `Cliente: ${input.customerName} (${input.customerPhone})`,
      `Para: ${when}`,
      'Revísala en tu panel de MiTiendita, sección Citas.',
    ].join('\n');
    return this.send(input.recipient, body);
  }

  /** Aviso de texto cuando entra una suscripción a un plan digital. */
  async sendSubscriptionNotification(input: {
    recipient: string | null | undefined;
    storeName: string;
    planName: string;
    customerName: string;
    customerPhone: string;
  }): Promise<WhatsappNotificationResult> {
    const body = [
      `⭐ Nueva suscripción — ${input.storeName}`,
      `Plan: ${input.planName}`,
      `Cliente: ${input.customerName} (${input.customerPhone})`,
      'Actívala en tu panel de MiTiendita, sección Suscripciones.',
    ].join('\n');
    return this.send(input.recipient, body);
  }

  /** Aviso de texto cuando entra un pedido nuevo. */
  async sendOrderNotification(input: {
    recipient: string | null | undefined;
    storeName: string;
    orderCode: string;
    customerName: string;
    total: string;
    currency: string;
    deliveryMethod: string;
  }): Promise<WhatsappNotificationResult> {
    const body = [
      `🛒 Nuevo pedido ${input.orderCode}`,
      input.storeName,
      `Cliente: ${input.customerName}`,
      `Entrega: ${input.deliveryMethod === 'delivery' ? 'Delivery' : 'Recojo en tienda'}`,
      `Total: ${input.currency} ${input.total}`,
      'Revísalo en tu panel de MiTiendita.',
    ].join('\n');
    return this.send(input.recipient, body);
  }
}
