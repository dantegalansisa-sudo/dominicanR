import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CHILD_PRICE_DEFAULT, EXCURSIONS, FEATURED_SLUGS } from '../data/excursions';
import type { Excursion } from '../data/excursions';
import { FLEET } from '../data/fleet';
import type { Vehicle } from '../data/fleet';
import { DRINKS, SEATS, STOPS } from '../data/passengers';
import { DEFAULT_TABLES } from '../data/pricing';
import type { PricingTables } from '../data/pricing';

/**
 * De dónde salen los datos de la web. Al arrancar se leen los archivos de
 * src/data, que son los mismos con los que se sembró la base; en cuanto
 * /api/catalog responde, manda la base, que es lo que el cliente edita en el
 * panel. Si la API no existe (Vercel) o falla, la web sigue con lo empaquetado
 * y nadie nota nada.
 */

export interface ExtraItem {
  id: string;
  label: string;
  price: number;
  minutes: number | null;
  visible?: boolean;
}

export interface Settings {
  whatsapp: string;
  email: string;
  phone: string;
  location: string;
}

export interface Catalog {
  excursions: Excursion[];
  featuredSlugs: string[];
  fleet: Vehicle[];
  pricing: PricingTables;
  extras: { seats: ExtraItem[]; drinks: ExtraItem[]; stops: ExtraItem[] };
  settings: Settings;
  /** true cuando ya se leyó la base; false mientras se usa lo empaquetado. */
  live: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  whatsapp: '18292191573',
  email: 'dominicanroutes@gmail.com',
  phone: '+1 (829) 219-1573',
  location: 'Punta Cana, La Altagracia',
};

const BUNDLED: Catalog = {
  excursions: EXCURSIONS.map((e) => ({
    ...e,
    childPrice: e.adultsOnly ? null : CHILD_PRICE_DEFAULT,
    cashAllowed: !['coco-bongo', 'imagine-punta-cana', 'dolphin-explorer'].includes(e.slug),
  })),
  featuredSlugs: [...FEATURED_SLUGS],
  fleet: FLEET,
  pricing: DEFAULT_TABLES,
  extras: {
    seats: SEATS.map((s) => ({ ...s, minutes: null })),
    drinks: DRINKS.map((d) => ({ ...d, minutes: null })),
    stops: STOPS.map((s) => ({ ...s })),
  },
  settings: DEFAULT_SETTINGS,
  live: false,
};

/** La forma en que llega /api/catalog. */
interface RemoteCatalog {
  ok: boolean;
  excursions: (Omit<Excursion, 'category'> & { category: string })[];
  featured: string[];
  fleet: Vehicle[];
  pricing: {
    brackets: { upTo: number | null; prices: PricingTables['brackets'][number]['prices'] }[];
    zones: Record<string, string[]>;
    rules: PricingTables['rules'];
    routes?: PricingTables['routes'];
  };
  extras: { seats: ExtraItem[]; drinks: ExtraItem[]; stops: ExtraItem[] };
  settings: Partial<Settings>;
}

function fromRemote(r: RemoteCatalog): Catalog {
  return {
    excursions: r.excursions as Excursion[],
    featuredSlugs: r.featured,
    fleet: r.fleet,
    pricing: {
      brackets: r.pricing.brackets,
      zones: r.pricing.zones,
      rules: r.pricing.rules,
      routes: r.pricing.routes ?? [],
    },
    extras: r.extras,
    settings: { ...DEFAULT_SETTINGS, ...r.settings },
    live: true,
  };
}

const CatalogContext = createContext<Catalog>(BUNDLED);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(BUNDLED);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/catalog', { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: RemoteCatalog | null) => {
        if (body?.ok && Array.isArray(body.excursions) && body.excursions.length > 0) {
          setCatalog(fromRemote(body));
        }
      })
      .catch(() => {
        // Sin API (Vercel, o el servidor caído): se queda lo empaquetado.
      });
    return () => ctrl.abort();
  }, []);

  const value = useMemo(() => catalog, [catalog]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);

export const useSettings = () => useContext(CatalogContext).settings;
