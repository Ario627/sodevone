import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { HealthResponse } from '@kelas/contracts';
import type { Response } from 'express';
import { APP_VERSION } from '../app-version.js';
import { DatabaseService } from '../db/database.service.js';

const LIVE_RESPONSE = { status: 'ok' as const };

@ApiTags('kesehatan')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  private async inspect(): Promise<HealthResponse> {
    const database = await this.database.probe();

    return {
      status: database === 'error' ? 'degraded' : 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      version: APP_VERSION,
      checks: { database },
    };
  }

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Status layanan beserta pemeriksaan dependensi' })
  @ApiOkResponse({ description: 'Layanan merespons, termasuk saat basis data bermasalah' })
  check(): Promise<HealthResponse> {
    return this.inspect();
  }

  @Get('live')
  @SkipThrottle()
  @ApiOperation({ summary: 'Apakah proses masih hidup' })
  live(): typeof LIVE_RESPONSE {
    return LIVE_RESPONSE;
  }

  @Get('ready')
  @SkipThrottle()
  @ApiOperation({ summary: 'Apakah layanan siap menerima lalu lintas' })
  async ready(@Res({ passthrough: true }) response: Response): Promise<HealthResponse> {
    const result = await this.inspect();

    if (result.status !== 'ok') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }
}
