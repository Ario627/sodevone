import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HomeResponse } from '@kelas/contracts';
import { PUBLIC_READ_CACHE } from '../common/http/cache-control.js';
import { HomeService } from './home.service.js';

@ApiTags('beranda')
@Controller('api/public/home')
export class HomeController {
  constructor(private readonly service: HomeService) {}

  @Get()
  @ApiOperation({ summary: 'Ringkasan beranda dalam satu permintaan' })
  @ApiOkResponse({ description: 'Pengumuman terbaru, agenda terdekat, dan album terbaru' })
  @Header('Cache-Control', PUBLIC_READ_CACHE)
  overview(): Promise<HomeResponse> {
    return this.service.overview();
  }
}
