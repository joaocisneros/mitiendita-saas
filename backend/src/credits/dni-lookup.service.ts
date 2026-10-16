import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toTitleCase } from '../common/utils/text.util';
import { readCredentials } from '../superadmin/services/sa-document-api.service';

type DniData = {
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  nombre?: string;
};

/**
 * Autocompleta nombre y apellidos de una clienta a partir de su DNI, con la
 * conexión RUC/DNI que configura el superadmin. El proveedor responde en
 * mayúsculas; aquí se guarda como "María Quispe Rojas".
 */
@Injectable()
export class DniLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(companyId: string, rawNumber: string) {
    const number = rawNumber.replace(/\D/g, '');
    if (number.length !== 8) {
      throw new BadRequestException('El DNI debe tener 8 dígitos.');
    }
    const config = await this.prisma.documentApiConfig.findUnique({
      where: { id: 1 },
    });
    if (!config?.enabled) {
      throw new ServiceUnavailableException(
        'La consulta de DNI no está disponible. Completa los datos a mano.',
      );
    }

    const { apiKey, apiSecret } = readCredentials(config);
    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/consultas/dni/${number}`, {
        headers: {
          'X-Api-Key': apiKey,
          'X-Api-Secret': apiSecret,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new BadGatewayException(
        'No se pudo consultar el DNI. Completa los datos a mano.',
      );
    }
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: DniData | null;
    } & DniData;
    const data = body?.success === undefined ? body : body.data;
    if (!response.ok || body?.success === false || !data) {
      throw new NotFoundException(
        'No se encontraron datos para ese DNI. Completa los datos a mano.',
      );
    }

    const lastName = [data.apellido_paterno, data.apellido_materno]
      .filter(Boolean)
      .join(' ');
    const existing = await this.prisma.creditCustomer.findUnique({
      where: {
        companyId_documentNumber: { companyId, documentNumber: number },
      },
      select: { id: true },
    });
    return {
      documentNumber: number,
      firstName: toTitleCase(data.nombres ?? ''),
      lastName: toTitleCase(lastName),
      fullName: toTitleCase(data.nombre ?? ''),
      // Si ya está registrada, el panel avisa en vez de duplicarla.
      existingCustomerId: existing?.id ?? null,
    };
  }
}
