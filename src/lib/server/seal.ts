import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

// Chiffrement des résultats non payés (renvoyés au navigateur sous forme illisible)
// et jetons de déblocage signés. Pas de base de données : tout est vérifiable avec le secret.

function secret(purpose: string): Buffer {
  const base = process.env.APP_SECRET || `${process.env.ANTHROPIC_API_KEY || 'dev'}:ou-on-part`;
  return createHash('sha256').update(`${purpose}:${base}`).digest();
}

const b64url = (b: Buffer) => b.toString('base64url');
const fromB64url = (s: string) => Buffer.from(s, 'base64url');

export function seal(data: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret('seal'), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return b64url(Buffer.concat([iv, cipher.getAuthTag(), enc]));
}

export function unseal<T>(sealed: string): T | null {
  try {
    const raw = fromB64url(sealed);
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', secret('seal'), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')) as T;
  } catch {
    return null;
  }
}

export interface UnlockClaims {
  searchId: string;
  exp: number; // ms epoch
}

export function signToken(claims: UnlockClaims): string {
  const payload = b64url(Buffer.from(JSON.stringify(claims)));
  const sig = b64url(createHmac('sha256', secret('token')).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyToken(token: string | undefined | null): UnlockClaims | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret('token')).update(payload).digest();
  const given = fromB64url(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claims = JSON.parse(fromB64url(payload).toString('utf8')) as UnlockClaims;
    return claims.exp > Date.now() ? claims : null;
  } catch {
    return null;
  }
}

export function newSearchId(): string {
  return b64url(randomBytes(9));
}
