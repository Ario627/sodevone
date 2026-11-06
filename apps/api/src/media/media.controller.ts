import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ImageVariantSchema, UuidSchema, type ImageVariant } from '@kelas/contracts';
import type { Response } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { MediaService } from './media.service.js';

const MEDIA_CACHE = 'public, max-age=31536000, immutable';

const DEFAULT_VARIANT: ImageVariant = 'sedang';

const VARIANT_QUERY = ImageVariantSchema.catch(DEFAULT_VARIANT);

@ApiTags('media')
@Controller('api/media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Menyajikan satu berkas gambar album' })
  @ApiParam({ name: 'id', description: 'UUID gambar' })
  @ApiOkResponse({ description: 'Berkas gambar dengan tipe dari basis data' })
  async serve(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Query('ukuran', new ZodValidationPipe(VARIANT_QUERY)) variant: ImageVariant,
    @Res() response: Response,
  ): Promise<void> {
    const image = await this.service.serve(id, variant);

    response.setHeader('Cache-Control', MEDIA_CACHE);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Type', image.mimeType);
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('ETag', image.etag);

    const ifNoneMatch = response.req.headers['if-none-match'];

    if (typeof ifNoneMatch === 'string' && ifNoneMatch === image.etag) {
      response.status(304).end();

      return;
    }

    response.setHeader('Content-Length', String(image.byteSize));
    image.stream.on('error', () => response.destroy());
    image.stream.pipe(response);
  }
}
