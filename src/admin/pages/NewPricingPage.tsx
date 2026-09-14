import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PlaceField from '../../components/PlaceField';
import { emptyPlace } from '../../data/places';
import type { PlaceValue } from '../../data/places';
import { fetchDistance } from '../../utils/googlePlaces';
import { api, parseJson } from '../api';
import type { BracketRow, VehicleRow } from '../api';
import { Field, useToast } from '../ui';

type Prices = Record<string, number>;

const PinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

/** Una casilla por vehículo. Vacía = ese vehículo se cotiza a mano. */
function PriceGrid({ fleet, prices, onChange }: { fleet: VehicleRow[]; prices: Prices; onChange: (p: Prices) => void }) {
  return (
    <div className="adm-grid adm-grid--3">
      {fleet.map((v) => (
        <Field key={v.slug} label={v.name} hint={v.type}>
          <input
            type="number"
            min={0}
            placeholder="a cotizar"
            value={prices[v.slug] ?? ''}
            onChange={(e) => {
              const next = { ...prices };
              if (e.target.value === '') delete next[v.slug];
              else next[v.slug] = Number(e.target.value);
              onChange(next);
            }}
          />
        </Field>
      ))}
    </div>
  );
}

export default function NewPricingPage() {
  const toast = useToast();
  const [fleet, setFleet] = useState<VehicleRow[]>([]);

  // --- tramo
  const [upTo, setUpTo] = useState('');
  const [bracketPrices, setBracketPrices] = useState<Prices>({});
  const [savingBracket, setSavingBracket] = useState(false);

  // --- ruta
  const [origin, setOrigin] = useState<PlaceValue>(emptyPlace());
  const [destination, setDestination] = useState<PlaceValue>(emptyPlace());
  const [label, setLabel] = useState('');
  const [routePrices, setRoutePrices] = useState<Prices>({});
  const [radius, setRadius] = useState('8');
  const [km, setKm] = useState<{ km: number | null; minutes: number | null } | 'loading' | null>(null);
  const [savingRoute, setSavingRoute] = useState(false);

  useEffect(() => {
    api
      .get<{ vehicles: VehicleRow[] }>('/vehicles')
      .then((r) => setFleet(r.vehicles.filter((v) => v.visible)))
      .catch((e) => toast(e.message, true));
  }, [toast]);

  // En cuanto los dos puntos están elegidos en Google se piden los km por
  // carretera. Solo entonces: cada consulta se factura.
  const originId = origin.chosen ? (origin.placeId ?? origin.text) : '';
  const destId = destination.chosen ? (destination.placeId ?? destination.text) : '';
  useEffect(() => {
    if (!originId || !destId) {
      setKm(null);
      return;
    }
    const ctrl = new AbortController();
    setKm('loading');
    fetchDistance(origin, destination, ctrl.signal).then((r) => setKm({ km: r.km, minutes: r.minutes }));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originId, destId]);

  const addBracket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(bracketPrices).length === 0) {
      toast('Pon el precio de al menos un vehículo.', true);
      return;
    }
    setSavingBracket(true);
    try {
      // Se añade a los que ya hay y el servidor los ordena por km y comprueba
      // que ninguno cobre menos que el anterior.
      const r = await api.get<{ brackets: BracketRow[] }>('/pricing');
      const existing = r.brackets.map((b) => ({
        up_to: b.up_to,
        prices: parseJson<Prices>(b.prices, { sedan: b.sedan, minivan: b.minivan, minibus: b.minibus, 'vip-luxury': b.vip }),
      }));
      await api.put('/pricing/brackets', {
        brackets: [...existing, { up_to: upTo === '' ? null : Number(upTo), prices: bracketPrices }],
      });
      toast(`Tramo ${upTo === '' ? 'abierto' : `hasta ${upTo} km`} añadido. Ya está en Tarifas.`);
      setUpTo('');
      setBracketPrices({});
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setSavingBracket(false);
    }
  };

  const addRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.text.trim() || !destination.text.trim()) {
      toast('Elige el origen y el destino.', true);
      return;
    }
    if (Object.keys(routePrices).length === 0) {
      toast('Pon el precio de al menos un vehículo.', true);
      return;
    }
    setSavingRoute(true);
    try {
      await api.post('/pricing/routes', {
        label,
        // El nombre que eligió (no la dirección postal): es lo que se muestra y
        // lo que sirve para reconocer el sitio cuando no hay coordenadas.
        a: { text: origin.text, lat: origin.lat, lng: origin.lng },
        b: { text: destination.text, lat: destination.lat, lng: destination.lng },
        km: km && km !== 'loading' ? km.km : null,
        radiusKm: Number(radius) || 8,
        prices: routePrices,
      });
      toast('Ruta añadida. Ya está en Tarifas y en la web.');
      setOrigin(emptyPlace());
      setDestination(emptyPlace());
      setLabel('');
      setRoutePrices({});
      setKm(null);
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setSavingRoute(false);
    }
  };

  const autoLabel =
    origin.text && destination.text ? `${origin.text.split(',')[0]} ↔ ${destination.text.split(',')[0]}` : '';

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">Nueva tarifa</h1>
          <p className="adm__sub">
            Lo que añadas aquí se guarda al momento y aparece en <Link to="/admin/tarifas">Tarifas</Link>, donde se
            corrige o se borra. Precios en US$; deja vacío el vehículo que se cotice a mano.
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------- ruta cerrada */}
      <form className="adm__card" onSubmit={addRoute}>
        <h2 className="adm__card-title">Ruta con precio cerrado</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 16 }}>
          Escribe el origen y el destino y elige el sitio exacto en la lista de Google. La web calcula los kilómetros y
          tú pones el precio total. Cuando un visitante pida ese mismo viaje (en cualquier sentido), verá este precio.
        </p>

        <div className="adm-grid" style={{ gap: '0 14px' }}>
          <div className="adm-route-place">
            <PlaceField
              id="np-origin"
              label="Origen"
              placeholder="Aeropuerto, hotel, dirección…"
              icon={<PinIcon />}
              groups={[]}
              value={origin}
              onChange={setOrigin}
              google
            />
          </div>
          <div className="adm-route-place">
            <PlaceField
              id="np-dest"
              label="Destino"
              placeholder="Aeropuerto, hotel, dirección…"
              icon={<PinIcon />}
              groups={[]}
              value={destination}
              onChange={setDestination}
              google
            />
          </div>
        </div>

        <p className="adm__sub" style={{ margin: '4px 0 16px', minHeight: 20 }}>
          {km === 'loading'
            ? 'Calculando la distancia…'
            : km && km.km != null
              ? `${Math.round(km.km)} km por carretera${km.minutes != null ? ` · unas ${Math.round(km.minutes / 60)} h ${km.minutes % 60} min` : ''}`
              : km && km.km == null
                ? 'Google no encontró ruta por carretera entre esos dos puntos.'
                : origin.chosen && destination.chosen
                  ? ''
                  : 'Elige los dos puntos de la lista para ver la distancia.'}
        </p>

        <PriceGrid fleet={fleet} prices={routePrices} onChange={setRoutePrices} />

        <div className="adm-grid">
          <Field label="Nombre de la ruta" hint="Opcional. Se muestra en el resumen y en el correo de la reserva.">
            <input value={label} placeholder={autoLabel || 'Se genera solo'} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Margen (km)" hint="Hasta cuántos km del punto guardado cuenta como el mismo sitio. 8 cubre una zona hotelera.">
            <input type="number" min={1} max={50} value={radius} onChange={(e) => setRadius(e.target.value)} />
          </Field>
        </div>

        <div className="adm-bar adm-bar--end">
          <button className="adm-btn adm-btn--primary" type="submit" disabled={savingRoute}>
            {savingRoute ? 'Guardando…' : 'Añadir ruta'}
          </button>
        </div>
      </form>

      {/* ------------------------------------------------------------ tramo */}
      <form className="adm__card" onSubmit={addBracket}>
        <h2 className="adm__card-title">Tramo por distancia</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 16 }}>
          Para los viajes sin ruta cerrada. El tramo se coloca solo en su sitio según los kilómetros; no puede cobrar
          menos que el tramo anterior.
        </p>
        <div className="adm-grid adm-grid--3">
          <Field label="Hasta km" hint="Límite superior del tramo. Vacío = tramo abierto (el último).">
            <input type="number" min={1} value={upTo} onChange={(e) => setUpTo(e.target.value)} placeholder="abierto" />
          </Field>
        </div>
        <PriceGrid fleet={fleet} prices={bracketPrices} onChange={setBracketPrices} />
        <div className="adm-bar adm-bar--end">
          <button className="adm-btn adm-btn--primary" type="submit" disabled={savingBracket}>
            {savingBracket ? 'Guardando…' : 'Añadir tramo'}
          </button>
        </div>
      </form>
    </>
  );
}
