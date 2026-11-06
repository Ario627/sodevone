import { SessionResponseSchema, type SessionResponse } from '@kelas/contracts';
import { DASAR_API } from './dasar';

export const MASUK = `${DASAR_API}/auth/login`;

export const KELUAR = `${DASAR_API}/auth/logout`;

export const SESI = `${DASAR_API}/auth/session`;

export function bacaSesi(nilai: unknown): SessionResponse {
  return SessionResponseSchema.parse(nilai);
}