import { useEffect, useRef, useState } from 'react';
import PlaceField from '../../components/PlaceField';
import { emptyPlace } from '../../data/places';
import type { PlaceValue } from '../../data/places';
import { fetchDistance } from '../../utils/googlePlaces';
import { api, parseJson } from '../api';
import type { RouteRow, VehicleRow } from '../api';
import { Field, useToast } from '../ui';
import { PriceGrid } from './NewPricingPage';

type Prices = Record<string, number>;

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

/** Lo que abre el editor: una ruta existente, una copia de otra o una nueva. */
export type RouteEdit = { mode: 'edit' | 'copy'; route: RouteRow } | { mode: 'new' };

const placeOf = (text: string, lat: number | null, lng: number | null): PlaceValue => ({
  text,
  chosen: true,
  ...(lat != null && lng != null ? { lat, lng } : {}),
});

/**
 * Editor completo de una ruta con precio cerrado, en la propia página de
 * Tarifas: nombre, origen y destino (Google), km, margen, precios y si está
 * activa. Sirve para editar, para crear una nueva y para guardar una copia
 * (que se crea como ruta nueva, sin tocar la original).
 */
export default function RouteEditor({
  edit,
  fleet,
  onDone,
  onCancel,
}: {
  edit: RouteEdit;
  fleet: VehicleRow[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const src = edit.mode === 'new' ? null : edit.route;
  const box = useRef<HTMLFormElement>(null);

  const [label, setLabel] = useState(src ? (edit.mode === 'copy' ? `${src.label} (copia)` : src.label) : '');
  const [origin, setOrigin] = useState<PlaceValue>(src ? placeOf(src.a_text, src.a_lat, src.a_lng) : emptyPlace());
  const [destination, setDestination] = useState<PlaceValue>(src ? placeOf(src.b_text, src.b_lat, src.b_lng) : emptyPlace());
  const [km, setKm] = useState(src?.km != null ? String(Math.round(src.km)) : '');
  const [radius, setRadius] = useState(String(src?.radius_km ?? 8));
  const [prices, setPrices] = useState<Prices>(src ? parseJson<Prices>(src.prices, {}) : {});
  const [visible, setVisible] = useState(src ? src.visible !== 0 : true);
  const [kmState, setKmState] = useState<'idle' | 'loading' | 'none'>('idle');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    box.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [edit]);

  // Si cambia algún punto (elegido en Google), se recalculan los km. Al abrir
  // una ruta existente no: ya los tiene y cada consulta se factura.
  const originKey = origin.chosen ? `${origin.placeId ?? origin.text}` : '';
  const destKey = destination.chosen ? `${destination.placeId ?? destination.text}` : '';
  const initialKeys = useRef(`${originKey}|${destKey}`);
  useEffect(() => {
    if (src && `${originKey}|${destKey}` === initialKeys.current) return;
    if (!originKey || !destKey) return;
    const ctrl = new AbortController();
    setKmState('loading');
    fetchDistance(origin, destination, ctrl.signal).then((r) => {
      if (r.km != null) {
        setKm(String(Math.round(r.km)));
        setKmState('idle');
      } else setKmState('none');
    });
    return () => {
      ctrl.abort();
      setKmState('idle');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originKey, destKey]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.text.trim() || !destination.text.trim()) {
      toast('Elige el origen y el destino.', true);
      return;
    }
    if (Object.keys(prices).length === 0) {
      toast('Pon el precio de al menos un vehículo.', true);
      return;
    }
    const body = {
      label,
      a: { text: origin.text, lat: origin.lat ?? null, lng: origin.lng ?? null },
      b: { text: destination.text, lat: destination.lat ?? null, lng: destination.lng ?? null },
      km: km === '' ? null : Number(km),
      radiusKm: Number(radius) || 8,
      prices,
      visible,
    };
    setSaving(true);
    try {
      if (edit.mode === 'edit') {
        await api.put(`/pricing/routes/${edit.route.id}`, body);
        toast('Ruta guardada.');
      } else {
        await api.post('/pricing/routes', body);
        toast(edit.mode === 'copy' ? 'Copia creada.' : 'Ruta creada.');
      }
      onDone();
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const title = edit.mode === 'edit' ? 'Editar ruta' : edit.mode === 'copy' ? 'Duplicar ruta' : 'Nueva ruta';

  return (
    <form className="adm__card adm-route-editor" ref={box} onSubmit={save}>
      <h2 className="adm__card-title">{title}</h2>
      <p className="adm__sub" style={{ marginTop: -8, marginBottom: 16 }}>
        {edit.mode === 'copy'
          ? 'Se guarda como una ruta nueva; la original no cambia. Cambia el destino (o el origen) y los precios.'
          : 'Elige los puntos en la lista de Google para que la web reconozca el viaje. Los km se recalculan solos al cambiar un punto.'}
      </p>

      <div className="adm-grid" style={{ gap: '0 14px' }}>
        <div className="adm-route-place">
          <PlaceField id="re-origin" label="Origen" placeholder="Aeropuerto, hotel, dirección…" icon={<PinIcon />} groups={[]} value={origin} onChange={setOrigin} google />
        </div>
        <div className="adm-route-place">
          <PlaceField id="re-dest" label="Destino" placeholder="Aeropuerto, hotel, dirección…" icon={<PinIcon />} groups={[]} value={destination} onChange={setDestination} google />
        </div>
      </div>

      <div className="adm-grid adm-grid--3">
        <Field label="Nombre de la ruta" hint="Vacío = «Origen ↔ Destino».">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`${origin.text.split(',')[0] || 'Origen'} ↔ ${destination.text.split(',')[0] || 'Destino'}`} />
        </Field>
        <Field
          label="Km"
          hint={kmState === 'loading' ? 'Calculando…' : kmState === 'none' ? 'Google no encontró ruta; ponlos a mano.' : 'Por carretera. Solo informativo.'}
        >
          <input type="number" min={0} value={km} onChange={(e) => setKm(e.target.value)} />
        </Field>
        <Field label="Margen (km)" hint="Cuánto alrededor de cada punto cuenta como el mismo sitio.">
          <input type="number" min={1} max={50} value={radius} onChange={(e) => setRadius(e.target.value)} />
        </Field>
      </div>

      <PriceGrid fleet={fleet} prices={prices} onChange={setPrices} />

      <label className="adm-check" style={{ marginTop: 8 }}>
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        <span>Activa (si la desactivas, la web deja de usar este precio sin borrarlo)</span>
      </label>

      <div className="adm-bar adm-bar--end">
        <button className="adm-btn" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="adm-btn adm-btn--primary" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : edit.mode === 'edit' ? 'Guardar cambios' : 'Crear ruta'}
        </button>
      </div>
    </form>
  );
}
