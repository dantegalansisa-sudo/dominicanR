import { useMemo } from 'react';
import { useLang } from './index';
import type { Dict, Lang } from './index';
import { EXCURSIONS_EN } from './excursions.en';
import { FLEET_EN } from './fleet.en';
import { CATEGORIES } from '../data/excursions';
import type { Excursion } from '../data/excursions';
import type { Vehicle } from '../data/fleet';
import { AIRPORTS, ZONES } from '../data/places';
import type { PlaceGroup } from '../data/places';
import type { Extras, Party } from '../data/passengers';
import { useCatalog } from '../catalog/CatalogProvider';
import type { ExtraItem } from '../catalog/CatalogProvider';

/**
 * El catálogo en el idioma de la web. Los datos salen del CatalogProvider
 * (la base cuando responde, src/data si no); aquí solo se sustituyen los
 * textos por su versión en inglés. Primero lo que traiga la propia excursión
 * (`en`, editado desde el panel), después la traducción que viene en el
 * proyecto, y si no hay ninguna se deja el español antes que un hueco.
 */

export function localizeExcursion(e: Excursion, lang: Lang): Excursion {
  if (lang === 'es') return e;
  const own = e.en;
  const tr = EXCURSIONS_EN[e.slug];
  if (!own && !tr) return e;
  const tickets = e.tickets?.map((t, i) => ({
    ...t,
    name: own?.tickets?.[i]?.name || tr?.tickets?.[i]?.name || t.name,
    includes: own?.tickets?.[i]?.includes || tr?.tickets?.[i]?.includes || t.includes,
  }));
  return {
    ...e,
    name: own?.name || tr?.name || e.name,
    duration: own?.duration || tr?.duration || e.duration,
    description: own?.description || tr?.description || e.description,
    includes: own?.includes?.length ? own.includes : (tr?.includes ?? e.includes),
    activities: own?.activities?.length ? own.activities : (tr?.activities ?? e.activities),
    tickets,
  };
}

export function localizeVehicle(v: Vehicle, lang: Lang): Vehicle {
  if (lang === 'es') return v;
  const own = v.en;
  const tr = FLEET_EN[v.slug];
  if (!own && !tr) return v;
  return {
    ...v,
    name: own?.name || tr?.name || v.name,
    type: own?.type || tr?.type || v.type,
    summary: own?.summary || tr?.summary || v.summary,
    features: own?.features?.length ? own.features : (tr?.features ?? v.features),
  };
}

/** Todas las excursiones visibles, en el idioma de la web. */
export function useExcursions(): Excursion[] {
  const { lang } = useLang();
  const { excursions } = useCatalog();
  return useMemo(() => excursions.map((e) => localizeExcursion(e, lang)), [excursions, lang]);
}

/** Las mismas, pero en español pase lo que pase: para el correo al operador. */
export function useExcursionsEs(): Excursion[] {
  return useCatalog().excursions;
}

export function useFeaturedExcursions(): Excursion[] {
  const all = useExcursions();
  const { featuredSlugs } = useCatalog();
  return useMemo(
    () =>
      featuredSlugs
        .map((slug) => all.find((e) => e.slug === slug))
        .filter((e): e is Excursion => Boolean(e)),
    [all, featuredSlugs],
  );
}

export function useFleet(): Vehicle[] {
  const { lang } = useLang();
  const { fleet } = useCatalog();
  return useMemo(() => fleet.map((v) => localizeVehicle(v, lang)), [fleet, lang]);
}

export function useFleetEs(): Vehicle[] {
  return useCatalog().fleet;
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

const localizeExtra = (items: ExtraItem[], names: Record<string, string>, lang: Lang) =>
  items
    .filter((x) => x.visible !== false)
    .map((x) => ({ ...x, label: lang === 'en' ? (names[x.id] ?? x.label) : x.label }));

/** Sillas, bebidas y paradas con el precio de la base y la etiqueta traducida. */
export function useExtrasCatalog() {
  const { lang, t } = useLang();
  const { extras } = useCatalog();
  return useMemo(
    () => ({
      seats: localizeExtra(extras.seats, t.extras.seats, lang),
      drinks: localizeExtra(extras.drinks, t.extras.drinks, lang),
      stops: localizeExtra(extras.stops, t.extras.stops, lang),
    }),
    [extras, t, lang],
  );
}

export function usePricing() {
  return useCatalog().pricing;
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

/**
 * Líneas de adicionales con etiquetas y precios de un catálogo dado: el
 * traducido para el resumen lateral, el de la base en español para el correo.
 */
export function extrasLinesWith(
  cat: { seats: ExtraItem[]; drinks: ExtraItem[]; stops: ExtraItem[] },
  e: Extras,
  usd: (n: number) => string,
  stopLine: string,
) {
  const out: string[] = [];
  for (const s of cat.seats) {
    const n = e.seats[s.id as keyof Extras['seats']] ?? 0;
    if (n > 0) out.push(`${s.label} x${n} — ${usd(s.price * n)}`);
  }
  for (const d of cat.drinks) {
    const n = e.drinks[d.id as keyof Extras['drinks']] ?? 0;
    if (n > 0) out.push(`${d.label} x${n} — ${usd(d.price * n)}`);
  }
  const stop = cat.stops.find((s) => s.id === e.stop);
  if (stop) out.push(`${stopLine}, ${stop.label} — ${usd(stop.price)}`);
  return out;
}

export function extrasTotalWith(
  cat: { seats: ExtraItem[]; drinks: ExtraItem[]; stops: ExtraItem[] },
  e: Extras,
) {
  const seats = cat.seats.reduce((sum, s) => sum + s.price * (e.seats[s.id as keyof Extras['seats']] ?? 0), 0);
  const drinks = cat.drinks.reduce((sum, d) => sum + d.price * (e.drinks[d.id as keyof Extras['drinks']] ?? 0), 0);
  const stop = cat.stops.find((s) => s.id === e.stop)?.price ?? 0;
  return seats + drinks + stop;
}

/** Fecha corta en el formato del idioma (dd/mm/aaaa o mm/dd/yyyy). */
export function prettyDateT(lang: Lang, iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!d || !m || !y) return iso;
  return lang === 'en' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}
