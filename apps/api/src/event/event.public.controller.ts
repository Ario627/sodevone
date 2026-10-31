import {
  Controller,
  Get,
  Header,
  HttpStatus,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SlugSchema, type EventCollection, type EventDetail } from '@kelas/contracts';
import type { Response } from 'express';
import { PUBLIC_READ_CACHE } from '../common/http/cache-control.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { EventService } from './event.service.js';

@ApiTags('agenda')
@Controller('api/public/events')
export class EventPublicController {
  constructor(private readonly service: EventService) {}

  @Get()
  @ApiOperation({ summary: 'Kegiatan mendatang dan yang sudah berlalu' })
  @ApiOkResponse({ description: 'Dua kumpulan kegiatan yang tidak saling tumpang tindih' })
  @Header('Cache-Control', PUBLIC_READ_CACHE)
  collection(): Promise<EventCollection> {
    return this.service.collection();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detail kegiatan berdasarkan slug' })
  @ApiParam({ name: 'slug', description: 'Slug kegiatan' })
  @ApiOkResponse({ description: 'Detail kegiatan yang sudah terbit' })
  async detail(
    @Param('slug', new ZodValidationPipe(SlugSchema)) slug: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EventDetail> {
    const result = await this.service.detail(slug);

    if (result.kind === 'missing') {
      throw new NotFoundException('Kegiatan tidak ditemukan.');
    }

    if (result.kind === 'moved') {
      response.status(HttpStatus.MOVED_PERMANENTLY);
      response.setHeader('Location', `/api/public/events/${result.slug}`);
      response.setHeader('Cache-Control', 'no-store');
    } else {
      response.setHeader('Cache-Control', PUBLIC_READ_CACHE);
    }

    return result.detail;
  }
}