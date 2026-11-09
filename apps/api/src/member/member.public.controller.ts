import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { MemberCollection } from '@kelas/contracts';
import type { Response } from 'express';
import { MemberService } from './member.service.js';

const MEMBER_CACHE = 'public, max-age=60, stale-while-revalidate=300';

@ApiTags('anggota')
@Controller('api/public/members')
export class MemberPublicController {
  constructor(private readonly service: MemberService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar anggota kelas yang sudah disetujui untuk tampil' })
  @ApiOkResponse({ description: 'Anggota kelas dalam urutan kursi' })
  @Header('Vary', 'Accept-Encoding')
  async list(@Res({ passthrough: true }) response: Response): Promise<MemberCollection> {
    const { items, etag } = await this.service.collection();

    response.setHeader('Cache-Control', MEMBER_CACHE);
    response.setHeader('ETag', etag);

    const ifNoneMatch = response.req.headers['if-none-match'];

    if (typeof ifNoneMatch === 'string' && ifNoneMatch === etag) {
      response.status(304);
    }

    return { items };
  }
}