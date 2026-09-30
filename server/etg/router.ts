import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { db } from '../db.ts';
import { apiCredentials, etgConfig, etgEnv } from './config.ts';
import { EtgError, errorBody } from './errors.ts';
import { search } from './search.ts';
import { book, cancel, statusOf } from './orders.ts';
import { purgeEtg } from './db.ts';

/**
 * API para ETG: POST /search, /book, /status, /cancel con HTTP Basic Auth.
 * Se sirve en la raíz de los subdominios de la API (api.… y staging-api.…)
 * y, además, bajo /etg-api en cualquier dominio (pruebas locales).
 */

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

function basicAuth(req: Request, res: Response, next: NextFunction) {
  const creds = apiCredentials();
  if (!creds) {
    // Sin credenciales configuradas la API está apagada.
    res.status(503).json({ code: 'API_DISABLED', error: 'ETG API is not configured on this server' });
    return;
  }
  const header = req.headers.authorization ?? '';
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() === 'basic' && value) {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep > 0 && same(decoded.slice(0, sep), creds.user) && same(decoded.slice(sep + 1), creds.password)) {
      next();
      return;
    }
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="ETG Transfers API", charset="UTF-8"');
  res.status(401).json({ code: 'UNAUTHORIZED', error: 'invalid or missing Basic Auth credentials' });
}

/** Deja cada llamada en etg_api_logs (el visor del panel lee de aquí). */
function logCall(endpoint: string, req: Request, status: number, started: number, response: unknown) {
  try {
    const isSearch = endpoint === '/search';
    const full = !isSearch || etgConfig().logSearchBodies || status !== 200;
    const res = response as { offers?: unknown[]; order_id?: string } | undefined;
    const summary = isSearch && !full ? { offers: Array.isArray(res?.offers) ? res!.offers!.length : 0 } : response;
    const body = req.body as { order_id?: unknown } | undefined;
    db.prepare(
      'INSERT INTO etg_api_logs (env, endpoint, status_code, duration_ms, order_code, request, response) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(
      etgEnv(),
      endpoint,
      status,
      Date.now() - started,
      typeof res?.order_id === 'string' ? res.order_id : typeof body?.order_id === 'string' ? body.order_id : null,
      JSON.stringify(req.body ?? null),
      JSON.stringify(summary ?? null),
    );
  } catch (err) {
    console.error('ETG: no se pudo guardar el log:', err);
  }
}

const handler =
  (endpoint: string, fn: (body: unknown) => unknown) =>
  (req: Request, res: Response) => {
    const started = Date.now();
    let status = 200;
    let payload: unknown;
    try {
      payload = fn(req.body);
    } catch (err) {
      if (!(err instanceof EtgError)) console.error(`ETG ${endpoint}:`, err);
      status = err instanceof EtgError ? err.status : 500;
      payload = errorBody(err);
    }
    // UTF-8 tal cual: JSON.stringify no escapa a \uXXXX los caracteres no
    // ASCII, así que cirílico, árabe o emojis salen idénticos a como llegaron.
    res.status(status).type('application/json; charset=utf-8').send(JSON.stringify(payload));
    logCall(endpoint, req, status, started, payload);
  };

export const etgApiRouter = Router();
etgApiRouter.use(basicAuth);
etgApiRouter.post('/search', handler('/search', search));
etgApiRouter.post('/book', handler('/book', book));
etgApiRouter.post('/status', handler('/status', statusOf));
etgApiRouter.post('/cancel', handler('/cancel', cancel));
// Cualquier otra ruta o método de la API: mismo formato de error.
etgApiRouter.use((req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', error: `${req.method} ${req.path} is not an ETG API method` });
});

/** Dominios en los que la API se sirve en la raíz. */
export function apiHosts(): string[] {
  return (process.env.ETG_API_HOSTS ?? 'api.dominicanroutes.com,staging-api.dominicanroutes.com')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export const isApiHost = (req: Request) => apiHosts().includes((req.hostname || '').toLowerCase());

/** Un JSON mal formado también responde con { code, error }. */
export function etgJsonErrors(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (isApiHost(req) || req.path.startsWith('/etg-api')) {
    const e = err as { type?: string; message?: string };
    res
      .status(500)
      .json(
        e?.type === 'entity.parse.failed'
          ? { code: 'INVALID_JSON', error: 'request body is not valid JSON' }
          : { code: 'INTERNAL_ERROR', error: 'Unexpected technical error, please retry' },
      );
    return;
  }
  next(err);
}

/** Limpieza cada hora de búsquedas caducadas y logs viejos. */
export function startEtgHousekeeping() {
  const run = () => {
    try {
      purgeEtg();
    } catch (err) {
      console.error('ETG: limpieza fallida:', err);
    }
  };
  run();
  setInterval(run, 60 * 60 * 1000).unref();
}
