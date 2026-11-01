import type { CanActivate, ExecutionContext } from '@nestjs/common';
import {
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminRole } from '@kelas/contracts';
import type { Request } from 'express';
import type { SessionContext } from './auth.service.js';
import { AuthService } from './auth.service.js';
import { readSessionToken } from './session-cookie.js';

export const ROLES_KEY = 'kelas:roles';

const UNAUTHENTICATED_MESSAGE = 'Sesi tidak ditemukan atau sudah berakhir. Silakan masuk kembali.';

export type SessionRequest = Request & { authSession?: SessionContext };

export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionContext => {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const session = request.authSession;

    if (session === undefined) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: UNAUTHENTICATED_MESSAGE,
      });
    }

    return session;
  },
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const token = readSessionToken(request);

    if (token === undefined) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: UNAUTHENTICATED_MESSAGE,
      });
    }

    const session = await this.auth.resolveSession(token);

    if (session === undefined) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: UNAUTHENTICATED_MESSAGE,
      });
    }

    request.authSession = session;

    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required === undefined || required.length === 0) {
      return true;
    }

    const session = context.switchToHttp().getRequest<SessionRequest>().authSession;

    if (session === undefined) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: UNAUTHENTICATED_MESSAGE,
      });
    }

    if (!required.includes(session.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Peran Anda tidak diizinkan untuk tindakan ini.',
      });
    }

    return true;
  }
}