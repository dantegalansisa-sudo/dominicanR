import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import MagneticButton from '../components/MagneticButton';
import PlaceField from '../components/PlaceField';
import { suggestVehicle } from '../components/PassengersField';
import { TRANSFER_PLACES } from '../data/places';
import {
  DRINKS,
  EMPTY_EXTRAS,
  SEATS,
  STOPS,
  TRANSFER_BANDS,
  extrasLines,
  extrasTotal,
} from '../data/passengers';
import type { Extras, SeatId, DrinkId } from '../data/passengers';

/** Lo que el buscador del hero deja al navegar hasta aquí. */
export interface BookingSeed {
  origin?: string;
  destination?: string;
  date?: string;
  time?: string;
  adults?: number;
  round?: boolean;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

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
const FLAG = 'M5 21V4m0 0h11l-2 3.5L16 11H5';

const prettyDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="passengers__stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Menos ${label}`}
      >
        –
      </button>
      <strong aria-live="polite">{value}</strong>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Más ${label}`}
      >
        +
      </button>
    </div>
  );
}

export default function BookingPage() {
  const seed = (useLocation().state ?? {}) as BookingSeed;

  const [origin, setOrigin] = useState(seed.origin ?? '');
  const [destination, setDestination] = useState(seed.destination ?? '');
  const [date, setDate] = useState(seed.date ?? '');
  const [time, setTime] = useState(seed.time ?? '');
  const [round, setRound] = useState(Boolean(seed.round));
  const [adults, setAdults] = useState(seed.adults ?? 2);
  const [children, setChildren] = useState(0);
  const [extras, setExtras] = useState<Extras>(EMPTY_EXTRAS);
  const [flight, setFlight] = useState('');
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Reservar traslado — Dominican Routes';
  }, []);

  const total = adults + children;
  const vehicle = suggestVehicle(total);

  const setSeat = (id: SeatId, n: number) =>
    setExtras((e) => ({ ...e, seats: { ...e.seats, [id]: Math.max(0, Math.min(6, n)) } }));

  const setDrink = (id: DrinkId, n: number) =>
    setExtras((e) => ({
      ...e,
      drinks: { ...e.drinks, [id]: Math.max(0, Math.min(40, n)) },
    }));

  // Clicking the selected block again clears it — otherwise there is no way to
  // undo a stop once you have picked one.
  const pickStop = (id: (typeof STOPS)[number]['id']) =>
    setExtras((e) => ({ ...e, stop: e.stop === id ? null : id }));

  const extraLines = extrasLines(extras);
  const extrasSum = extrasTotal(extras);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;

    const blocks = [
      [`Solicitud de traslado${round ? ' ida y vuelta' : ''}.`],
      [
        `Origen: ${origin || '(por confirmar)'}`,
        `Destino: ${destination || '(por confirmar)'}`,
        `Fecha: ${prettyDate(date) || '(por confirmar)'}`,
        `Hora: ${time || '(por confirmar)'}`,
        ...(flight ? [`Vuelo: ${flight}`] : []),
      ],
      [
        `Pasajeros: ${adults} ${adults === 1 ? 'adulto' : 'adultos'}${
          children ? `, ${children} ${children === 1 ? 'niño' : 'niños'}` : ''
        }`,
        ...(vehicle ? [`Vehículo sugerido por la web: ${vehicle.name}.`] : []),
      ],
      extraLines.length
        ? [
            'Adicionales solicitados:',
            ...extraLines.map((l) => `  · ${l}`),
            `  Total en adicionales: $${extrasSum} USD (el traslado se cotiza aparte)`,
          ]
        : ['Sin adicionales.'],
      ...(notes ? [[`Notas: ${notes}`]] : []),
    ];

    const message = blocks.map((b) => b.join(String.fromCharCode(10))).join(
      String.fromCharCode(10, 10),
    );

    setStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          topic: 'Traslado',
          date,
          message,
        }),
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
          <Link className="catalogue__back" to="/">
            <Ico d={ARROW} flip />
            Volver al inicio
          </Link>
          <p className="eyebrow">Paso 2 de 2</p>
          <h1 className="h1 booking-page__title">Completa tu traslado</h1>
          <p className="booking-page__sub">
            Confirmamos por correo con el precio cerrado, normalmente el mismo
            día. Todavía no se cobra nada.
          </p>
        </div>

        <form className="booking-form" onSubmit={submit} noValidate>
          <div className="booking-form__main">
            <section className="bcard">
              <h2 className="bcard__title">El viaje</h2>

              <div className="bcard__grid">
                <PlaceField
                  id="bk-origin"
                  label="Origen"
                  placeholder="Aeropuerto, hotel o zona"
                  icon={<Ico d={PIN} size={13} />}
                  groups={TRANSFER_PLACES}
                  value={origin}
                  onChange={setOrigin}
                />
                <PlaceField
                  id="bk-dest"
                  label="Destino"
                  placeholder="Hotel, zona o dirección"
                  icon={<Ico d={FLAG} size={13} />}
                  groups={TRANSFER_PLACES}
                  value={destination}
                  onChange={setDestination}
                />
                <label className="form__field">
                  <span>Fecha</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label className="form__field">
                  <span>Hora de recogida</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
                <label className="form__field bcard__full">
                  <span>Número de vuelo (opcional)</span>
                  <input
                    value={flight}
                    onChange={(e) => setFlight(e.target.value)}
                    placeholder="Para seguir tu vuelo si se adelanta o retrasa"
                  />
                </label>
              </div>

              <button
                type="button"
                className="search__return bcard__return"
                onClick={() => setRound((v) => !v)}
                aria-pressed={round}
              >
                <span className={`switch${round ? ' is-on' : ''}`}>
                  <motion.span
                    className="switch__knob"
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                </span>
                Necesito el regreso también
              </button>
            </section>

            <section className="bcard">
              <h2 className="bcard__title">Quiénes viajan</h2>
              {(['adults', 'children'] as const).map((key) => {
                const band = TRANSFER_BANDS[key];
                const value = key === 'adults' ? adults : children;
                const setter = key === 'adults' ? setAdults : setChildren;
                return (
                  <div className="passengers__row" key={key}>
                    <div>
                      <p className="passengers__row-label">{band.label}</p>
                      <p className="passengers__row-hint">{band.hint}</p>
                    </div>
                    <Stepper
                      value={value}
                      min={key === 'adults' ? 1 : 0}
                      max={50}
                      onChange={setter}
                      label={band.label.toLowerCase()}
                    />
                  </div>
                );
              })}
              {vehicle && (
                <p className="passengers__note bcard__hint">
                  Para {total} {total === 1 ? 'pasajero' : 'pasajeros'} sugerimos{' '}
                  <strong>{vehicle.name}</strong> ({vehicle.model}).
                </p>
              )}
            </section>

            <section className="bcard">
              <h2 className="bcard__title">Adicionales</h2>
              <p className="bcard__lead">
                Todo opcional y en dólares. Lo sumamos a la cotización del
                traslado.
              </p>

              <div className="extras">
                <div className="extras__group">
                  <p className="extras__group-title">Sillas para niños</p>
                  {SEATS.map((seat) => (
                    <div className="extras__row" key={seat.id}>
                      <div>
                        <p className="passengers__row-label">{seat.label}</p>
                        <p className="passengers__row-hint">${seat.price} c/u</p>
                      </div>
                      <Stepper
                        value={extras.seats[seat.id]}
                        min={0}
                        max={6}
                        onChange={(n) => setSeat(seat.id, n)}
                        label={seat.label.toLowerCase()}
                      />
                    </div>
                  ))}
                </div>

                <div className="extras__group">
                  <p className="extras__group-title">A bordo</p>
                  {DRINKS.map((drink) => (
                    <div className="extras__row" key={drink.id}>
                      <div>
                        <p className="passengers__row-label">{drink.label}</p>
                        <p className="passengers__row-hint">${drink.price} c/u</p>
                      </div>
                      <Stepper
                        value={extras.drinks[drink.id]}
                        min={0}
                        max={40}
                        onChange={(n) => setDrink(drink.id, n)}
                        label={drink.unit}
                      />
                    </div>
                  ))}
                </div>

                <div className="extras__group extras__group--wide">
                  <p className="extras__group-title">Paradas adicionales</p>
                  <p className="extras__group-hint">
                    Supermercado, farmacia, cajero… se cobra por tiempo de espera.
                  </p>
                  <div className="stops">
                    {STOPS.map((stop) => {
                      const on = extras.stop === stop.id;
                      return (
                        <button
                          key={stop.id}
                          type="button"
                          className={`stop${on ? ' is-on' : ''}`}
                          onClick={() => pickStop(stop.id)}
                          aria-pressed={on}
                        >
                          {on && (
                            <motion.span
                              layoutId="stop-pill"
                              className="stop__pill"
                              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            />
                          )}
                          <span className="stop__time">{stop.label}</span>
                          <span className="stop__price">${stop.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {extrasSum > 0 && (
                  <motion.p
                    className="extras__total"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span>Total en adicionales</span>
                    <strong>${extrasSum} USD</strong>
                  </motion.p>
                )}
              </AnimatePresence>

              <label className="form__field bcard__notes">
                <span>Algo más que debamos saber</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Equipaje voluminoso, silla de ruedas, celebración…"
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
                  <dt>Ruta</dt>
                  <dd>
                    {origin || '—'} → {destination || '—'}
                    {round ? ' (ida y vuelta)' : ''}
                  </dd>
                </div>
                <div>
                  <dt>Cuándo</dt>
                  <dd>
                    {prettyDate(date) || '—'} {time && `· ${time}`}
                  </dd>
                </div>
                <div>
                  <dt>Pasajeros</dt>
                  <dd>
                    {adults} {adults === 1 ? 'adulto' : 'adultos'}
                    {children
                      ? `, ${children} ${children === 1 ? 'niño' : 'niños'}`
                      : ''}
                  </dd>
                </div>
                {extraLines.length > 0 && (
                  <div>
                    <dt>Adicionales</dt>
                    <dd>
                      {extraLines.join(' · ')}
                      <br />
                      <strong>${extrasSum} USD</strong>
                    </dd>
                  </div>
                )}
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
