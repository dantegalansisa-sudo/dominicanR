import { useMemo } from 'react';
import { useLang } from './index';
import type { Dict, Lang } from './index';
import { EXCURSIONS_EN } from './excursions.en';
import { FLEET_EN } from './fleet.en';
import { CATEGORIES, EXCURSIONS, FEATURED_SLUGS } from '../data/excursions';
import type { Excursion } from '../data/excursions';
import { FLEET } from '../data/fleet';
import type { Vehicle } from '../data/fleet';
import { AIRPORTS, ZONES } from '../data/places';
import type { PlaceGroup } from '../data/places';
import { DRINKS, SEATS, STOPS } from '../data/passengers';
import type { Extras, Party } from '../data/passengers';

/**
 * El catálogo en el idioma de la web. Los datos de src/data siguen siendo la
 * fuente (precios, fotos, slugs); aquí solo se sustituyen los textos cuando
 * hay traducción, y si falta alguna se deja el español antes que un hueco.
 */

export function localizeExcursion(e: Excursion, lang: Lang): Excursion {
  if (lang === 'es') return e;
  const tr = EXCURSIONS_EN[e.slug];
  if (!tr) return e;
  return {
    ...e,
    name: tr.name ?? e.name,
    duration: tr.duration,
    description: tr.description,
    includes: tr.includes,
    activities: tr.activities,
    tickets: e.tickets?.map((t, i) => ({
      ...t,
      name: tr.tickets?.[i]?.name ?? t.name,
      includes: tr.tickets?.[i]?.includes ?? t.includes,
    })),
  };
}

export function localizeVehicle(v: Vehicle, lang: Lang): Vehicle {
  if (lang === 'es') return v;
  const tr = FLEET_EN[v.slug];
  if (!tr) return v;
  return { ...v, name: tr.name ?? v.name, type: tr.type, summary: tr.summary, features: tr.features };
}

export function useExcursions(): Excursion[] {
  const { lang } = useLang();
  return useMemo(() => EXCURSIONS.map((e) => localizeExcursion(e, lang)), [lang]);
}

export function useFeaturedExcursions(): Excursion[] {
  const all = useExcursions();
  return useMemo(
    () => FEATURED_SLUGS.map((slug) => all.find((e) => e.slug === slug)).filter((e): e is Excursion => Boolean(e)),
    [all],
  );
}

export function useFleet(): Vehicle[] {
  const { lang } = useLang();
  return useMemo(() => FLEET.map((v) => localizeVehicle(v, lang)), [lang]);
}

export function useCategories() {
  const { t } = useLang();
  return useMemo(
    () => CATEGORIES.map((c) => ({ id: c.id, label: t.excursions.categories[c.id] ?? c.label })),
    [t],
  );
}

/** El código IATA va entre paréntesis al final del nombre; sirve de clave. */
const iata = (name: string) => /\(([A-Z]{3})\)\s*$/.exec(name)?.[1] ?? '';

export function useAirports(): string[] {
  const { t } = useLang();
  return useMemo(() => AIRPORTS.map((a) => t.places.airportNames[iata(a)] ?? a), [t]);
}

export function useTransferPlaces(): PlaceGroup[] {
  const { t } = useLang();
  const airports = useAirports();
  return useMemo(
    () => [
      { label: t.places.airports, items: airports },
      { label: t.places.zones, items: ZONES },
    ],
    [t, airports],
  );
}

export function usePickupPlaces(): PlaceGroup[] {
  const { t } = useLang();
  const airports = useAirports();
  return useMemo(
    () => [
      { label: t.places.hotelZones, items: ZONES },
      { label: t.places.airports, items: airports },
    ],
    [t, airports],
  );
}

export function useExtrasCatalog() {
  const { t } = useLang();
  return useMemo(
    () => ({
      seats: SEATS.map((s) => ({ ...s, label: t.extras.seats[s.id] ?? s.label })),
      drinks: DRINKS.map((d) => ({ ...d, label: t.extras.drinks[d.id] ?? d.label })),
      stops: STOPS.map((s) => ({ ...s, label: t.extras.stops[s.id] ?? s.label })),
    }),
    [t],
  );
}

/** "2 adultos, 1 niño" en el idioma que toque. */
export function partyLabelT(t: Dict, p: Party, withInfants = true) {
  const w = (n: number, k: 'adult' | 'child' | 'infant') =>
    `${n} ${n === 1 ? t.passengers[k].one : t.passengers[k].many}`;
  const bits = [w(p.adults, 'adult')];
  if (p.children) bits.push(w(p.children, 'child'));
  if (withInfants && p.infants) bits.push(w(p.infants, 'infant'));
  return bits.join(', ');
}

/** Líneas del resumen lateral con las etiquetas traducidas. */
export function extrasLinesT(t: Dict, e: Extras, usd: (n: number) => string) {
  const out: string[] = [];
  for (const s of SEATS) {
    if (e.seats[s.id] > 0)
      out.push(`${t.extras.seats[s.id] ?? s.label} x${e.seats[s.id]} — ${usd(s.price * e.seats[s.id])}`);
  }
  for (const d of DRINKS) {
    if (e.drinks[d.id] > 0)
      out.push(`${t.extras.drinks[d.id] ?? d.label} x${e.drinks[d.id]} — ${usd(d.price * e.drinks[d.id])}`);
  }
  const stop = STOPS.find((s) => s.id === e.stop);
  if (stop) out.push(`${t.extras.stopLine}, ${t.extras.stops[stop.id] ?? stop.label} — ${usd(stop.price)}`);
  return out;
}

/** Fecha corta en el formato del idioma (dd/mm/aaaa o mm/dd/yyyy). */
export function prettyDateT(lang: Lang, iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!d || !m || !y) return iso;
  return lang === 'en' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}
