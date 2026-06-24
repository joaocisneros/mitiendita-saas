import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly cloudinaryEnabled: boolean;

  constructor(private readonly config: ConfigService) {
    const cloud = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const key = this.config.get<string>('CLOUDINARY_API_KEY');
    const secret = this.config.get<string>('CLOUDINARY_API_SECRET');
    this.cloudinaryEnabled = Boolean(cloud && key && secret);

    if (this.cloudinaryEnabled) {
      cloudinary.config({
        cloud_name: cloud,
        api_key: key,
        api_secret: secret,
        secure: true,
      });
    } else {
      this.logger.warn(
        'Cloudinary no está configurado; se usará almacenamiento local de desarrollo.',
      );
    }
  }

  isEnabled(): boolean {
    return (
      this.cloudinaryEnabled || this.config.get('NODE_ENV') !== 'production'
    );
  }

  async uploadImage(
    file: Express.Multer.File,
    companyId: string,
    folder = 'general',
  ): Promise<{ url: string; publicId: string }> {
    if (!this.cloudinaryEnabled) return this.saveLocal(file, companyId, folder);

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `mitiendita/${companyId}/${folder}`,
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          },
          (error, uploaded) => {
            if (error || !uploaded) {
              return reject(
                error instanceof Error
                  ? error
                  : new Error('Cloudinary upload failed'),
              );
            }
            resolve(uploaded);
          },
        );
        stream.end(file.buffer);
      });
      return { url: result.secure_url, publicId: result.public_id };
    } catch (error) {
      if (this.config.get('NODE_ENV') === 'production') throw error;
      this.logger.warn(
        'Cloudinary no respondió; se usará almacenamiento local de desarrollo.',
      );
      return this.saveLocal(file, companyId, folder);
    }
  }

  /**
   * Borra una imagen por su URL (Cloudinary o local). No lanza si falla:
   * la limpieza nunca debe romper la operación principal.
   */
  async deleteByUrl(url: string | null | undefined): Promise<void> {
    if (!url) return;
    try {
      // Almacenamiento local de desarrollo.
      if (url.includes('/media/local/')) {
        const parts = url.split('/media/local/')[1]?.split('/');
        if (parts && parts.length === 3) {
          const [companyId, folder, filename] = parts;
          if (
            /^[a-zA-Z0-9-]+$/.test(companyId) &&
            /^[a-zA-Z0-9-]+$/.test(folder) &&
            /^[a-zA-Z0-9._-]+$/.test(filename)
          ) {
            await unlink(
              join(process.cwd(), 'uploads', companyId, folder, filename),
            ).catch(() => undefined);
          }
        }
        return;
      }
      // Cloudinary: derivar el public_id desde la URL y destruir.
      if (!this.cloudinaryEnabled) return;
      const publicId = this.cloudinaryPublicId(url);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo borrar la imagen (${url}): ${error instanceof Error ? error.message : 'error'}`,
      );
    }
  }

  /** Extrae el public_id de una URL de Cloudinary (sin versión ni extensión). */
  private cloudinaryPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return match ? match[1] : null;
  }

  async readLocal(companyId: string, folder: string, filename: string) {
    if (
      !/^[a-zA-Z0-9-]+$/.test(companyId) ||
      !/^[a-zA-Z0-9-]+$/.test(folder) ||
      !/^[a-zA-Z0-9._-]+$/.test(filename)
    ) {
      throw new NotFoundException('Imagen no encontrada.');
    }
    try {
      const buffer = await readFile(
        join(process.cwd(), 'uploads', companyId, folder, filename),
      );
      const extension = extname(filename).toLowerCase();
      const contentType =
        extension === '.png'
          ? 'image/png'
          : extension === '.webp'
            ? 'image/webp'
            : 'image/jpeg';
      return { buffer, contentType };
    } catch {
      throw new NotFoundException('Imagen no encontrada.');
    }
  }

  private async saveLocal(
    file: Express.Multer.File,
    companyId: string,
    folder: string,
  ) {
    const extension =
      file.mimetype === 'image/png'
        ? '.png'
        : file.mimetype === 'image/webp'
          ? '.webp'
          : '.jpg';
    const filename = `${randomUUID()}${extension}`;
    const directory = join(process.cwd(), 'uploads', companyId, folder);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), file.buffer);
    const baseUrl =
      this.config.get<string>('PUBLIC_API_URL') ??
      `http://localhost:${this.config.get('PORT') ?? 8300}/api`;
    return {
      url: `${baseUrl}/media/local/${companyId}/${folder}/${filename}`,
      publicId: `local/${companyId}/${folder}/${filename}`,
    };
  }
}
