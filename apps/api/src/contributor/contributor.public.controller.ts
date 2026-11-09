import { Controller, Get, Header, NotFoundException, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Contributor } from '@kelas/contracts';
import type { Response } from 'express';
import { ContributorService } from './contributor.service.js';

const CONTRIBUTOR_CACHE = 'public, max-age=60, stale-while-revalidate=300';

const MISSING_MESSAGE = 'Kartu pembuat belum tersedia.';

@ApiTags('pembuat')
@Controller('api/public/contributor')
export class ContributorPublicController {
  constructor(private readonly service: ContributorService) {}

  @Get()
  @ApiOperation({ summary: 'Kartu pembuat situs yang dikurasi pengurus' })
  @ApiOkResponse({ description: 'Identitas pembuat beserta fokus dan alat yang dipakai' })
  @Header('Vary', 'Accept-Encoding')
  async card(@Res({ passthrough: true }) response: Response): Promise<Contributor> {
    const result = await this.service.published();

    if (result === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: MISSING_MESSAGE });
    }

    response.setHeader('Cache-Control', CONTRIBUTOR_CACHE);
    response.setHeader('ETag', result.etag);

    const ifNoneMatch = response.req.headers['if-none-match'];

    if (typeof ifNoneMatch === 'string' && ifNoneMatch === result.etag) {
      response.status(304);
    }

    return result.contributor;
  }
}
