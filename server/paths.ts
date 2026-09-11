import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Rutas de disco, en su propio módulo para que el servidor y el panel puedan
 * usarlas sin importarse el uno al otro: index.ts monta admin.ts, así que si
 * admin.ts pidiera algo a index.ts se cerraría el círculo.
 */

export const DATA_DIR = resolve(process.env.DATA_DIR ?? resolve(process.cwd(), 'data'));

/**
 * Las fotos que sube el cliente viven fuera de dist/: si estuvieran dentro, el
 * siguiente despliegue las borraría al reemplazar la carpeta.
 */
export const UPLOADS = resolve(DATA_DIR, 'uploads');

export const DIST = resolve(process.cwd(), 'dist');

mkdirSync(UPLOADS, { recursive: true });
