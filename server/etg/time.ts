/**
 * Fechas y husos para ETG.
 *
 * Regla crítica: el `start_date_time` llega como "2026-12-10T14:00:00Z" pero la
 * "Z" NO es UTC: es la hora local del punto de recogida. No se convierte; se
 * devuelve la misma hora de reloj con el desfase de esa zona
 * ("2026-12-10T14:00:00-04:00"). El desfase se calcula para esa fecha
 * concreta, así que respeta el horario de verano allí donde exista.
 */

export interface LocalDateTime {
  /** "YYYY-MM-DDTHH:MM:SS" (con fracción si venía), sin zona. */
  wall: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?(?:[Zz]|[+-]\d{2}:?\d{2})?$/;

/** Lee la hora de reloj tal cual, descartando la zona que traiga. */
export function parseWall(input: unknown): LocalDateTime | null {
  if (typeof input !== 'string') return null;
  const m = RFC3339.exec(input.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s = '00'] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  // Fecha que no existe (31 de febrero): Date la desbordaría al mes siguiente.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1) return null;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return {
    wall: `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`,
    year,
    month,
    day,
    hour,
    minute,
    second,
  };
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(tz, f);
  }
  return f;
}

/** Desfase de la zona en un instante dado, en minutos (RD: -240). */
export function offsetAt(tz: string, instantMs: number): number {
  const parts = Object.fromEntries(dtf(tz).formatToParts(new Date(instantMs)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - Math.floor(instantMs / 1000) * 1000) / 60000);
}

/**
 * Instante real (UTC) de una hora de reloj en una zona. Dos pasadas bastan
 * para caer del lado bueno de un cambio de horario.
 */
export function wallToInstant(local: LocalDateTime, tz: string): number {
  const naive = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  let off = offsetAt(tz, naive);
  let instant = naive - off * 60000;
  const off2 = offsetAt(tz, instant);
  if (off2 !== off) {
    off = off2;
    instant = naive - off * 60000;
  }
  return instant;
}

export const formatOffset = (minutes: number) => {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
};

/** La hora de reloj pedida con el desfase de su zona: "…T14:00:00-04:00". */
export function withOffset(local: LocalDateTime, tz: string): string {
  const instant = wallToInstant(local, tz);
  return `${local.wall}${formatOffset(offsetAt(tz, instant))}`;
}

/** Un instante expresado como hora local de la zona, en RFC3339 con desfase. */
export function instantToRfc(instantMs: number, tz: string): string {
  const off = offsetAt(tz, instantMs);
  const local = new Date(Math.floor(instantMs / 1000) * 1000 + off * 60000);
  const iso = local.toISOString().slice(0, 19);
  return `${iso}${formatOffset(off)}`;
}

/** Hora de reloj → LocalDateTime a partir de "YYYY-MM-DDTHH:MM:SS". */
export const wallOf = (wall: string) => parseWall(wall);
