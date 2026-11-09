import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SiteSetting } from '@kelas/contracts';
import type { Response } from 'express';
import { SiteSettingService } from './site-setting.service.js';

const SETTING_CACHE = 'public, max-age=60, stale-while-revalidate=300';

@ApiTags('pengaturan')
@Controller('api/public/settings')
export class SettingPublicController {
  constructor(private readonly service: SiteSettingService) {}

  @Get()
  @ApiOperation({ summary: 'Pengaturan tampilan situs yang dapat diubah pengurus' })
  @ApiOkResponse({ description: 'Papan piksel beranda beserta waktu perubahan terakhir' })
  @Header('Vary', 'Accept-Encoding')
  async read(@Res({ passthrough: true }) response: Response): Promise<SiteSetting> {
    const { settings, etag } = await this.service.publicSettings();

    response.setHeader('Cache-Control', SETTING_CACHE);
    response.setHeader('ETag', etag);

    const ifNoneMatch = response.req.headers['if-none-match'];

    if (typeof ifNoneMatch === 'string' && ifNoneMatch === etag) {
      response.status(304);
    }

    return settings;
  }
}