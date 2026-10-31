import {
  Controller,
  Get,
  Header,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  AlbumDetailQuerySchema,
  AlbumListQuerySchema,
  SlugSchema,
  type AlbumDetail,
  type AlbumDetailQuery,
  type AlbumListQuery,
} from '@kelas/contracts';
import type { Response } from 'express';
import { PUBLIC_READ_CACHE } from '../common/http/cache-control.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AlbumService } from './album.service.js';
import type { AlbumPage } from './album.service.js';

@ApiTags('galeri')
@Controller('api/public/albums')
export class AlbumPublicController {
  constructor(private readonly service: AlbumService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar album yang sudah terbit' })
  @ApiOkResponse({ description: 'Daftar album beserta meta paginasi' })
  @Header('Cache-Control', PUBLIC_READ_CACHE)
  list(
    @Query(new ZodValidationPipe(AlbumListQuerySchema)) query: AlbumListQuery,
  ): Promise<AlbumPage> {
    return this.service.list(query.page, query.perPage);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detail album beserta satu halaman foto' })
  @ApiParam({ name: 'slug', description: 'Slug album' })
  @ApiOkResponse({ description: 'Detail album dengan foto yang dipaginasi' })
  async detail(
    @Param('slug', new ZodValidationPipe(SlugSchema)) slug: string,
    @Query(new ZodValidationPipe(AlbumDetailQuerySchema)) query: AlbumDetailQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AlbumDetail> {
    const result = await this.service.detail(slug, query);

    if (result.kind === 'missing') {
      throw new NotFoundException('Album tidak ditemukan.');
    }

    if (result.kind === 'moved') {
      response.status(HttpStatus.MOVED_PERMANENTLY);
      response.setHeader('Location', `/api/public/albums/${result.slug}`);
      response.setHeader('Cache-Control', 'no-store');
    } else {
      response.setHeader('Cache-Control', PUBLIC_READ_CACHE);
    }

    return result.detail;
  }
}