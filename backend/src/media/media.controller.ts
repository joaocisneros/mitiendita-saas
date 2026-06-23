import {
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MediaService } from './media.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Roles('OWNER', 'EMPLOYEE')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Public()
  @Get('local/:companyId/:folder/:filename')
  async localImage(
    @Param('companyId') companyId: string,
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const image = await this.media.readLocal(companyId, folder, filename);
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(image.buffer);
  }

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
    const safeFolder =
      folder === 'products' || folder === 'categories' ? folder : 'general';
    return this.media.uploadImage(file, companyId, safeFolder);
  }
}
