import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

/**
 * Acceso al panel. Contraseña con scrypt y una cookie firmada; nada de guardar
 * la contraseña ni de confiar en lo que venga del navegador.
 */

const SESSION_COOKIE = 'dr_admin';

/** Ocho horas: una jornada. Al día siguiente hay que volver a entrar. */
const SESSION_MS = 8 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  // Sin secreto cualquiera podría firmarse su propia sesión de administrador,
  // así que es mejor no arrancar que arrancar abierto de par en par.
  if (!s || s.length < 32) {
    throw new Error(
      'Falta SESSION_SECRET (mínimo 32 caracteres). Genera uno con: openssl rand -hex 32',
    );
  }
  return s;
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(plain, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  // Comparación de tiempo constante: con `===` el tiempo de respuesta filtra
  // cuántos caracteres iniciales acertó quien lo intenta.
  return timingSafeEqual(candidate, expected);
}

const sign = (payload: string) =>
  createHmac('sha256', secret()).update(payload).digest('base64url');

export function issueToken(email: string): string {
  const payload = `${email}|${Date.now() + SESSION_MS}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

export function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const payload = Buffer.from(body, 'base64url').toString();
  const expected = sign(payload);
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }

  const [email, expiresAt] = payload.split('|');
  if (!email || !expiresAt || Number(expiresAt) < Date.now()) return null;
  return email;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MS,
    path: '/',
  });
}

export const clearSessionCookie = (res: Response) =>
  res.clearCookie(SESSION_COOKIE, { path: '/' });

export interface AdminRequest extends Request {
  admin?: string;
}

/** Puerta de todas las rutas del panel. */
export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const email = readToken(req.cookies?.[SESSION_COOKIE]);
  if (!email) {
    res.status(401).json({ ok: false, error: 'Sesión caducada. Vuelve a entrar.' });
    return;
  }
  const user = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
  if (!user) {
    res.status(401).json({ ok: false, error: 'Sesión no válida.' });
    return;
  }
  req.admin = email;
  next();
}
