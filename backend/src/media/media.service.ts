import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

/**
 * Abstracción de almacenamiento de imágenes (Cloudinary).
 * Si el día de mañana migramos a S3, solo cambia este servicio.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const cloud = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const key = this.config.get<string>('CLOUDINARY_API_KEY');
    const secret = this.config.get<string>('CLOUDINARY_API_SECRET');
    this.enabled = Boolean(cloud && key && secret);

    if (this.enabled) {
      cloudinary.config({
        cloud_name: cloud,
        api_key: key,
        api_secret: secret,
        secure: true,
      });
    } else {
      this.logger.warn(
        'Cloudinary no está configurado: la subida de imágenes está deshabilitada.',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Sube una imagen y devuelve su URL segura.
   * Las imágenes se guardan en carpetas por empresa para mantener el orden.
   */
  async uploadImage(
    file: Express.Multer.File,
    companyId: string,
    folder = 'general',
  ): Promise<{ url: string; publicId: string }> {
    if (!this.enabled) {
      throw new InternalServerErrorException(
        'La subida de imágenes no está configurada.',
      );
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `mitiendita/${companyId}/${folder}`,
          resource_type: 'image',
          // Optimización automática para celulares: formato y calidad.
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, uploaded) => {
          if (error || !uploaded) return reject(error ?? new Error('upload'));
          resolve(uploaded);
        },
      );
      stream.end(file.buffer);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }
}
