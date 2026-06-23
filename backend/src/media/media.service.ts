import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { mkdir, readFile, writeFile } from 'fs/promises';
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
