import {
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { MediaService } from './media.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

@Roles('OWNER', 'EMPLOYEE')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /**
   * Sube una imagen y devuelve su URL. El frontend luego guarda esa URL
   * en el producto o la categoría.
   * Acepta jpg, png o webp, máximo 5 MB.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('companyId') companyId: string,
    @Query('folder') folder: string | undefined,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(jpe?g|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const safeFolder = folder === 'products' || folder === 'categories'
      ? folder
      : 'general';
    return this.media.uploadImage(file, companyId, safeFolder);
  }
}
