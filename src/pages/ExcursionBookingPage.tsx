import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import MagneticButton from '../components/MagneticButton';
import PlaceField from '../components/PlaceField';
import ExcursionCarousel from '../components/ExcursionCarousel';
import { ALWAYS_INCLUDED, CATEGORIES, EXCURSIONS } from '../data/excursions';
import { AGE_BANDS, EMPTY_PARTY, partyLabel, partyTotal } from '../data/passengers';
import type { Party } from '../data/passengers';
import { PICKUP_PLACES, emptyPlace, placeMapsUrl } from '../data/places';
import type { PlaceGroup, PlaceValue } from '../data/places';

/** Lo que dejan la ficha de excursión o el buscador al navegar hasta aquí. */
export interface ExcursionSeed {
  slug?: string;
  date?: string;
  party?: Party;
  pickup?: PlaceValue;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Máximo por salida; para grupos mayores el cliente coordina aparte. */
const MAX_PARTY = 50;

// El desplegable va agrupado por categoría: con 38 excursiones, una lista
// plana obliga a leerlas todas para encontrar la que se busca.
const EXCURSION_GROUPS: PlaceGroup[] = CATEGORIES.filter((c) => c.id !== 'todas')
  .map((c) => ({
    label: c.label,
    items: EXCURSIONS.filter((e) => e.category === c.id).map((e) => e.name),
  }))
  .filter((g) => g.items.length > 0);

const BANDS = [
  { key: 'adults', ...AGE_BANDS.adults, min: 1 },
  { key: 'children', ...AGE_BANDS.children, min: 0 },
  { key: 'infants', ...AGE_BANDS.infants, min: 0 },
] as const;

const Ico = ({
  d,
  size = 17,
  flip = false,
}: {
  d: string;
  size?: number;
  flip?: boolean;
}) => (
  <svg
    width={size}
    height={size}
    style={flip ? { transform: 'rotate(180deg)' } : undefined}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const ARROW = 'M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5';
const PIN = 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z';
const COMPASS = 'M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Zm-5-3.5-2 5.5-5.5 2 2-5.5 5.5-2Z';
const CLOCK = 'M12 7.5V12l3 1.8M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z';
const STAR = 'm12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z';
const COIN =
  'M12 3v18M16.5 7.2c-.8-1.1-2.4-1.8-4.2-1.8-2.4 0-4 1.2-4 3s1.6 2.6 4 3.1c2.6.6 4.4 1.4 4.4 3.3 0 2-1.9 3.2-4.4 3.2-2 0-3.7-.8-4.5-2';

const prettyDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

export default function ExcursionBookingPage() {
  const seed = (useLocation().state ?? {}) as ExcursionSeed;
  const seeded = seed.slug ? EXCURSIONS.find((e) => e.slug === seed.slug) : undefined;

  const [choice, setChoice] = useState<PlaceValue>(
    seeded ? emptyPlace(seeded.name) : emptyPlace(),
  );
  const [date, setDate] = useState(seed.date ?? '');
  const [pickup, setPickup] = useState<PlaceValue>(seed.pickup ?? emptyPlace());
  const [room, setRoom] = useState('');
  const [party, setParty] = useState<Party>(seed.party ?? EMPTY_PARTY);
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Reservar excursión — Dominican Routes';
  }, []);

  // Si el texto coincide con una del catálogo mostramos sus datos; si no,
  // vale igual, porque el cliente también arma salidas a medida.
  const excursion = useMemo(
    () => EXCURSIONS.find((e) => e.name === choice.text.trim()),
    [choice.text],
  );

  const total = partyTotal(party);
  const atMax = total >= MAX_PARTY;
  const pickupMap = placeMapsUrl(pickup);

  const step = (key: keyof Party, delta: number) => {
    if (delta > 0 && atMax) return;
    const band = BANDS.find((b) => b.key === key)!;
    setParty((p) => ({ ...p, [key]: Math.max(band.min, p[key] + delta) }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;

    // Los tramos van desglosados y con su rango de edad al lado: es
    // exactamente lo que el operador necesita para cotizar la salida.
    const blocks = [
      ['Solicitud de excursión.'],
      [
        `Excursión: ${choice.text || '(por confirmar)'}${
          excursion ? ` (${excursion.duration})` : ''
        }`,
        `Fecha: ${prettyDate(date) || '(por confirmar)'}`,
        `Punto de recogida: ${pickup.text || '(por confirmar)'}`,
        ...(pickup.address ? [`  Dirección: ${pickup.address}`] : []),
        ...(pickupMap ? [`  Ubicación exacta: ${pickupMap}`] : []),
        ...(room ? [`Número de habitación: ${room}`] : []),
      ],
      [
        `Pasajeros: ${partyLabel(party)}`,
        `  ${AGE_BANDS.adults.label} (${AGE_BANDS.adults.hint}): ${party.adults}`,
        `  ${AGE_BANDS.children.label} (${AGE_BANDS.children.hint}): ${party.children}`,
        `  ${AGE_BANDS.infants.label} (${AGE_BANDS.infants.hint}): ${party.infants}`,
      ],
      ...(notes ? [[`Notas: ${notes}`]] : []),
    ];

    const message = blocks
      .map((b) => b.join(String.fromCharCode(10)))
      .join(String.fromCharCode(10, 10));

    setStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, topic: 'Excursión', date, message }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && body.ok) setStatus('sent');
      else {
        setStatus('error');
        setError(body.error || 'No pudimos enviar tu solicitud. Intenta de nuevo.');
      }
    } catch {
      setStatus('error');
      setError('Revisa tu conexión e intenta de nuevo.');
    }
  };

  return (
    <section className="section booking-page">
      <div className="container booking-page__inner">
        <div className="booking-page__head">
          <Link className="catalogue__back" to="/excursiones">
            <Ico d={ARROW} flip />
            Ver todas las excursiones
          </Link>
          <p className="eyebrow">
            {excursion
              ? (CATEGORIES.find((c) => c.id === excursion.category)?.label ??
                'Excursiones')
              : 'Excursiones'}
          </p>
          <h1 className="h1 booking-page__title">Completa tu excursión</h1>
          <p className="booking-page__sub">
            Confirmamos por correo con el precio cerrado, normalmente el mismo
            día. Todavía no se cobra nada.
          </p>
        </div>

        <form className="booking-form" onSubmit={submit} noValidate>
          <div className="booking-form__main">
            <section className="bcard">
              {/* La galeria va arriba del todo: es lo que confirma al visitante
                  que esta reservando lo que creia. */}
              {excursion && excursion.photos.length > 0 && (
                <figure className="bcard__figure">
                  <ExcursionCarousel item={excursion} />
                </figure>
              )}

              <h2 className="bcard__title">
                {excursion ? excursion.name : 'La excursión'}
              </h2>

              {excursion && (
                <div className="exdetail">
                  <div className="exdetail__facts">
                    <span className="exdetail__fact">
                      <Ico d={CLOCK} size={15} />
                      {excursion.duration}
                    </span>
                    <span className="exdetail__fact">
                      <Ico d={STAR} size={15} />
                      {excursion.rating.toFixed(1)} · {excursion.reviews} reseñas
                    </span>
                    <span className="exdetail__fact">
                      <Ico d={PIN} size={15} />
                      Punta Cana
                    </span>
                    <span className="exdetail__fact">
                      <Ico d={COIN} size={15} />
                      {excursion.price === null
                        ? 'A cotizar'
                        : `Desde $${excursion.price} por adulto`}
                    </span>
                  </div>

                  <p className="exdetail__desc">{excursion.description}</p>

                  <h3 className="exdetail__sub">Lo que siempre está incluido</h3>
                  <ul className="exdetail__list">
                    {ALWAYS_INCLUDED.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bcard__grid">
                <div className="bcard__full">
                  <PlaceField
                    id="ex-choice"
                    label="Excursión"
                    placeholder="Elige una excursión"
                    icon={<Ico d={COMPASS} size={13} />}
                    groups={EXCURSION_GROUPS}
                    value={choice}
                    onChange={setChoice}
                  />
                </div>

                <label className="form__field bcard__full">
                  <span>Fecha</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>

                <div className="bcard__full">
                  <PlaceField
                    id="ex-pickup"
                    label="Punto de recogida"
                    placeholder="Tu hotel, zona o dirección"
                    icon={<Ico d={PIN} size={13} />}
                    groups={PICKUP_PLACES}
                    value={pickup}
                    onChange={setPickup}
                    google
                  />
                </div>

                <label className="form__field bcard__full">
                  <span>Número de habitación (opcional)</span>
                  <input
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Para saber dónde buscarte"
                  />
                </label>
              </div>
            </section>

            <section className="bcard">
              <h2 className="bcard__title">Quiénes viajan</h2>
              <p className="bcard__lead">
                El precio cambia según la edad, así que conviene afinarlo aquí.
              </p>

              {BANDS.map((band) => {
                const n = party[band.key];
                return (
                  <div className="passengers__row" key={band.key}>
                    <div>
                      <p className="passengers__row-label">{band.label}</p>
                      <p className="passengers__row-hint">{band.hint}</p>
                    </div>
                    <div className="passengers__stepper">
                      <button
                        type="button"
                        onClick={() => step(band.key, -1)}
                        disabled={n <= band.min}
                        aria-label={`Menos ${band.label.toLowerCase()}`}
                      >
                        –
                      </button>
                      <strong aria-live="polite">{n}</strong>
                      <button
                        type="button"
                        onClick={() => step(band.key, 1)}
                        disabled={atMax}
                        aria-label={`Más ${band.label.toLowerCase()}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              <p
                className={`passengers__note bcard__hint${
                  atMax ? ' passengers__note--warn' : ''
                }`}
              >
                {atMax ? (
                  <>
                    {MAX_PARTY} es lo máximo por salida. Para grupos mayores
                    coordinamos varias unidades: cuéntanoslo abajo.
                  </>
                ) : (
                  <>
                    Los <strong>infantes de 0 a 4 años no pagan</strong>. Niños y
                    adultos tienen tarifas distintas.
                  </>
                )}
              </p>

              <label className="form__field bcard__notes">
                <span>Algo más que debamos saber</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alergias, movilidad reducida, celebración, idioma del guía…"
                />
              </label>
            </section>
          </div>

          <aside className="booking-form__side">
            <div className="bcard bcard--sticky">
              <h2 className="bcard__title">Tus datos</h2>

              <label className="form__field">
                <span>Nombre</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="name"
                />
              </label>
              <label className="form__field">
                <span>Correo</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  autoComplete="email"
                />
              </label>
              <label className="form__field">
                <span>WhatsApp / teléfono</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Opcional"
                  autoComplete="tel"
                />
              </label>

              <dl className="summary">
                <div>
                  <dt>Excursión</dt>
                  <dd>{choice.text || '—'}</dd>
                </div>
                <div>
                  <dt>Cuándo</dt>
                  <dd>{prettyDate(date) || '—'}</dd>
                </div>
                <div>
                  <dt>Recogida</dt>
                  <dd>{pickup.text || '—'}</dd>
                </div>
                <div>
                  <dt>Pasajeros</dt>
                  <dd>{partyLabel(party)}</dd>
                </div>
              </dl>

              <MagneticButton
                className="btn btn--primary btn--block"
                block
                type="submit"
                magnetStrength={0.14}
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Enviando…' : 'Enviar solicitud'}
                {status !== 'sending' && <Ico d={ARROW} />}
              </MagneticButton>

              <AnimatePresence mode="wait">
                {status === 'sent' && (
                  <motion.p
                    key="ok"
                    className="form__note form__note--ok"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Ico d="M20 6 9 17l-5-5" size={16} />
                    Recibimos tu solicitud. Te confirmamos por correo.
                  </motion.p>
                )}
                {status === 'error' && (
                  <motion.p
                    key="bad"
                    className="form__note form__note--bad"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Ico
                      d="M12 8v5m0 3h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                      size={16}
                    />
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <p className="bcard__fine">
                No se cobra nada ahora. Te enviamos el precio cerrado por correo.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </section>
  );
}
