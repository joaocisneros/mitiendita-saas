import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService (Twilio)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('no llama a Twilio cuando la integración está desactivada', async () => {
    const config = { get: jest.fn().mockReturnValue('false') } as unknown as ConfigService;
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = new WhatsappService(config);

    const result = await service.sendProofNotification({
      recipient: '51987654321',
      storeName: 'Tienda demo',
      orderCode: 'MT-TEST01',
      customerName: 'Cliente demo',
      total: '29.90',
      currency: 'PEN',
      proofUrl: 'https://res.cloudinary.com/demo/proof.jpg',
    });

    expect(result.status).toBe('disabled');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('envía la foto del comprobante por Twilio (To/From/MediaUrl)', async () => {
    const values: Record<string, string> = {
      TWILIO_ENABLED: 'true',
      TWILIO_ACCOUNT_SID: 'ACtest',
      TWILIO_AUTH_TOKEN: 'token-de-prueba',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    };
    const config = { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ sid: 'SM123' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const service = new WhatsappService(config);

    const result = await service.sendProofNotification({
      recipient: '+51 987 654 321',
      storeName: 'Tienda demo',
      orderCode: 'MT-TEST01',
      customerName: 'Cliente demo',
      total: '29.90',
      currency: 'PEN',
      proofUrl: 'https://res.cloudinary.com/demo/proof.jpg',
    });

    expect(result).toEqual({ status: 'sent', messageId: 'SM123' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json',
    );
    const params = new URLSearchParams(
      String((fetchSpy.mock.calls[0][1] as RequestInit).body),
    );
    expect(params.get('To')).toBe('whatsapp:+51987654321');
    expect(params.get('From')).toBe('whatsapp:+14155238886');
    expect(params.get('MediaUrl')).toBe('https://res.cloudinary.com/demo/proof.jpg');
  });
});
