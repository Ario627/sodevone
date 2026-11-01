import type { CookieOptions, Request, Response } from 'express';

export const SESSION_COOKIE_NAME = 'kelas_session';

export type CookiePolicy = { secure: boolean };

function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/', signed: false };
}

export function readSessionToken(request: Request): string | undefined {
  const raw = request.cookies?.[SESSION_COOKIE_NAME];

  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

export function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date,
  policy: CookiePolicy,
): void {
  response.cookie(SESSION_COOKIE_NAME, token, { ...baseOptions(policy.secure), expires: expiresAt });
}

export function clearSessionCookie(response: Response, policy: CookiePolicy): void {
  response.clearCookie(SESSION_COOKIE_NAME, baseOptions(policy.secure));
}