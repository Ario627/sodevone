import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginRequestSchema, type LoginRequest, type SessionResponse } from '@kelas/contracts';
import type { Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '../common/interceptors/correlation-id.interceptor.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import { cookieSecure } from '../config/env.js';
import { AuthGuard, CurrentSession } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import type { LoginContext, SessionContext } from './auth.service.js';
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
  type CookiePolicy,
} from './session-cookie.js';
import { hashIp } from './token.js';

const NO_STORE = 'no-store';

const MAX_USER_AGENT_LENGTH = 255;

const MAX_CORRELATION_LENGTH = 64;

const SECONDS_PER_MINUTE = 60;

function contextOf(request: Request): LoginContext {
  const userAgent = request.headers['user-agent'];
  const correlationId = request.headers[CORRELATION_ID_HEADER];

  return {
    ipHash: hashIp(request.ip),
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
    correlationId:
      typeof correlationId === 'string' ? correlationId.slice(0, MAX_CORRELATION_LENGTH) : null,
  };
}

function throttleMessageOf(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / SECONDS_PER_MINUTE));

  return `Terlalu banyak percobaan masuk. Coba lagi dalam ${minutes} menit.`;
}

@ApiTags('autentikasi')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private cookiePolicy(): CookiePolicy {
    return {
      secure: cookieSecure(
        this.config.get('COOKIE_SECURE', { infer: true }),
        this.config.get('NODE_ENV', { infer: true }),
      ),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', NO_STORE)
  @ApiOperation({ summary: 'Membuat sesi pengurus dari nama pengguna dan kata sandi' })
  @ApiOkResponse({ description: 'Sesi dibuat, token dikirim lewat cookie HttpOnly' })
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) body: LoginRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const outcome = await this.service.login(body, contextOf(request));

    if (outcome.kind === 'throttled') {
      response.setHeader('Retry-After', String(outcome.retryAfterSeconds));

      throw new HttpException(
        { code: 'RATE_LIMITED', message: throttleMessageOf(outcome.retryAfterSeconds) },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (outcome.kind === 'invalid') {
      throw new HttpException(
        { code: 'UNAUTHENTICATED', message: 'Nama pengguna atau kata sandi salah.' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    setSessionCookie(response, outcome.token, new Date(outcome.expiresAt), this.cookiePolicy());

    return { user: outcome.user, expiresAt: outcome.expiresAt };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', NO_STORE)
  @ApiOperation({ summary: 'Mengakhiri sesi aktif dan menghapus cookie' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = readSessionToken(request);

    if (token !== undefined) {
      const session = await this.service.resolveSession(token);

      if (session !== undefined) {
        await this.service.logout(session, contextOf(request));
      }
    }

    clearSessionCookie(response, this.cookiePolicy());
  }

  @Get('session')
  @UseGuards(AuthGuard)
  @Header('Cache-Control', NO_STORE)
  @ApiCookieAuth('kelas_session')
  @ApiOperation({ summary: 'Informasi sesi yang sedang aktif' })
  @ApiOkResponse({ description: 'Pengguna dan waktu kedaluwarsa sesi' })
  session(@CurrentSession() session: SessionContext): SessionResponse {
    return {
      user: {
        id: session.userId,
        username: session.username,
        displayName: session.displayName,
        role: session.role,
      },
      expiresAt: session.expiresAt,
    };
  }
}