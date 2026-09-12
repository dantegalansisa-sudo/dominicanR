import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import MagneticButton from '../components/MagneticButton';
import PlaceField from '../components/PlaceField';
import PhoneField, { DEFAULT_COUNTRY, dialOf } from '../components/PhoneField';
import { suggestVehicle } from '../components/PassengersField';
import { quote } from '../data/pricing';
import { fetchDistance } from '../utils/googlePlaces';
import { emptyPlace, placeMapsUrl } from '../data/places';
import type { PlaceValue } from '../data/places';
import { EMPTY_EXTRAS, EMPTY_PARTY, partyLabel, partyTotal, usd } from '../data/passengers';
import type { Extras, SeatId, DrinkId, StopId, Party } from '../data/passengers';
import { useLang } from '../i18n';
import {
  extrasLinesWith,
  extrasTotalWith,
  partyLabelT,
  prettyDateT,
  useExtrasCatalog,
  useFleet,
  useFleetEs,
  usePricing,
  useTransferPlaces,
} from '../i18n/catalog';
import { useCatalog } from '../catalog/CatalogProvider';

/** Lo que el buscador del hero deja al navegar hasta aquí. */
export interface BookingSeed {
  origin?: PlaceValue;
  destination?: PlaceValue;
  date?: string;
  time?: string;
  /** El buscador ya reparte el grupo en los tres tramos. */
  party?: Party;
  round?: boolean;
  /** Slug del vehiculo, cuando se llega desde una tarjeta de la flota. */
  vehicle?: string;
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

const CAL = 'M4.5 6.5h15v14h-15zM4.5 11h15M9 3.5v4m6-4v4';
const CLOCK2 = 'M12 7.5V12l3 1.8M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z';
const PLANE = 'M2.5 12.5 21 4l-8 17-2.5-6.5zM10.5 14.5 21 4';

/** Para el correo al operador, siempre dd/mm/aaaa. */
const prettyDate = (iso: string) => prettyDateT('es', iso);

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
  const { t } = useLang();
  return (
    <div className="passengers__stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`${t.passengers.less} ${label}`}
      >
        –
      </button>
      <strong aria-live="polite">{value}</strong>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`${t.passengers.more} ${label}`}
      >
        +
      </button>
    </div>
  );
}

export default function BookingPage() {
  const seed = (useLocation().state ?? {}) as BookingSeed;
  const { lang, t } = useLang();
  const fleet = useFleet();
  const FLEET = useFleetEs();
  const tables = usePricing();
  const TRANSFER_PLACES = useTransferPlaces();
  const { seats: SEATS, drinks: DRINKS, stops: STOPS_T } = useExtrasCatalog();
  const extrasCat = useExtrasCatalog();
  const extrasEs = useCatalog().extras;
  const uiDate = (iso: string) => prettyDateT(lang, iso);

  const [origin, setOrigin] = useState<PlaceValue>(seed.origin ?? emptyPlace());
  const [destination, setDestination] = useState<PlaceValue>(
    seed.destination ?? emptyPlace(),
  );
  const [date, setDate] = useState(seed.date ?? '');
  const [time, setTime] = useState(seed.time ?? '');
  const [round, setRound] = useState(Boolean(seed.round));
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [party, setParty] = useState<Party>(seed.party ?? EMPTY_PARTY);
  const [vehicleSlug, setVehicleSlug] = useState<string | null>(seed.vehicle ?? null);
  // Si viene de una tarjeta de la flota ya eligio: se le muestra solo ese y no
  // la lista entera otra vez. "Cambiar" la despliega por si se lo piensa.
  const [locked, setLocked] = useState(
    Boolean(seed.vehicle && FLEET.some((v) => v.slug === seed.vehicle)),
  );
  const [extras, setExtras] = useState<Extras>(EMPTY_EXTRAS);
  const [flight, setFlight] = useState('');
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [km, setKm] = useState<number | null>(null);
  const [pricing, setPricing] = useState<'idle' | 'loading' | 'ready' | 'none'>('idle');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    document.title = t.titles.transfer;
  }, [t]);

  // Solo cuentan los extremos ya elegidos: cada consulta de ruta se factura, y
  // tecleando "bavaro" letra a letra se dispararian seis.
  const originId = origin.chosen ? (origin.placeId ?? origin.text.trim()) : '';
  const destId = destination.chosen ? (destination.placeId ?? destination.text.trim()) : '';

  useEffect(() => {
    if (!originId || !destId) {
      setKm(null);
      setPricing('idle');
      return;
    }
    const ctrl = new AbortController();
    setPricing('loading');
    const t = setTimeout(() => {
      fetchDistance(origin, destination, ctrl.signal).then((r) => {
        setKm(r.km);
        setPricing(r.km == null ? 'none' : 'ready');
      });
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // Depende de la identidad de cada extremo, no del objeto: reescribir el
    // texto sin cambiar de lugar no debe disparar otra llamada facturable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originId, destId]);

  /** El regreso recorre lo mismo otra vez, asi que cuenta doble. */
  const billableKm = km == null ? null : round ? km * 2 : km;

  const total = partyTotal(party);
  const chosen = vehicleSlug ? (fleet.find((v) => v.slug === vehicleSlug) ?? null) : null;
  const suggestedEs = suggestVehicle(FLEET, total);
  const suggested = suggestedEs ? (fleet.find((v) => v.slug === suggestedEs.slug) ?? null) : null;
  const vehicle = chosen ?? suggested;
  // El correo al operador va en español: nombre y tipo del catálogo original.
  const vehicleEs = vehicle ? (FLEET.find((v) => v.slug === vehicle.slug) ?? vehicle) : null;
  const overCapacity = vehicle != null && total > vehicle.maxPax;
  const priceFor = (slug: string) =>
    quote(billableKm, slug, origin.text, destination.text, tables);
  const chosenQuote = vehicle ? priceFor(vehicle.slug) : null;

  const setSeat = (id: SeatId, n: number) =>
    setExtras((e) => ({ ...e, seats: { ...e.seats, [id]: Math.max(0, Math.min(6, n)) } }));

  const setDrink = (id: DrinkId, n: number) =>
    setExtras((e) => ({
      ...e,
      drinks: { ...e.drinks, [id]: Math.max(0, Math.min(40, n)) },
    }));

  // Clicking the selected block again clears it — otherwise there is no way to
  // undo a stop once you have picked one.
  const pickStop = (id: StopId) =>
    setExtras((e) => ({ ...e, stop: e.stop === id ? null : id }));

  const extraLines = extrasLinesWith(extrasEs, extras, usd, 'Paradas adicionales');
  const extraLinesUi = extrasLinesWith(extrasCat, extras, usd, t.extras.stopLine);
  const extrasSum = extrasTotalWith(extrasEs, extras);

  const originMap = placeMapsUrl(origin);
  const destMap = placeMapsUrl(destination);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;

    // El formulario lleva noValidate, asi que `required` no lo aplica el
    // navegador: hay que comprobarlo aqui o el telefono se colaria vacio.
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setStatus('error');
      setError(t.booking.missingContact);
      return;
    }

    const blocks = [
      [
        `Solicitud de traslado${round ? ' ida y vuelta' : ''}.`,
        ...(lang === 'en' ? ['Idioma del cliente: inglés (reservó desde la web en inglés).'] : []),
      ],
      [
        `Origen: ${origin.text || '(por confirmar)'}`,
        ...(origin.address ? [`  Dirección: ${origin.address}`] : []),
        ...(originMap ? [`  Ubicación exacta: ${originMap}`] : []),
        `Destino: ${destination.text || '(por confirmar)'}`,
        ...(destination.address ? [`  Dirección: ${destination.address}`] : []),
        ...(destMap ? [`  Ubicación exacta: ${destMap}`] : []),
        `Fecha: ${prettyDate(date) || '(por confirmar)'}`,
        `Hora: ${time || '(por confirmar)'}`,
        ...(flight ? [`Vuelo: ${flight}`] : []),
        ...(round
          ? [
              `Regreso: ${prettyDate(returnDate) || '(fecha por confirmar)'}${
                returnTime ? ` a las ${returnTime}` : ''
              }`,
            ]
          : []),
      ],
      [
        `Pasajeros: ${partyLabel(party)}`,
        ...(chosen && vehicleEs
          ? [`Vehículo elegido por el cliente: ${vehicleEs.name} (${vehicleEs.type}).`]
          : vehicleEs
            ? [`Vehículo sugerido por la web: ${vehicleEs.name} (${vehicleEs.type}).`]
            : []),
        ...(overCapacity && vehicleEs
          ? [
              `AVISO: ${total} pasajeros superan los ${vehicleEs.maxPax} de ese vehículo.`,
            ]
          : []),
        ...(km != null
          ? [`Distancia: ${km} km${round ? ` (ida y vuelta: ${billableKm} km)` : ''}`]
          : []),
        ...(chosenQuote
          ? [
              `Precio calculado: US$${chosenQuote.total}`,
              ...(chosenQuote.surcharge
                ? [
                    `  Base US$${chosenQuote.base} + recargo US$${chosenQuote.surcharge.amount} (${chosenQuote.surcharge.label})`,
                  ]
                : [`  Sin recargo de ruta.`]),
            ]
          : ['Precio: a cotizar.']),
      ],
      extraLines.length
        ? [
            'Adicionales solicitados:',
            ...extraLines.map((l) => `  · ${l}`),
            `  Total en adicionales: ${usd(extrasSum)} (el traslado se cotiza aparte)`,
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
          phone: `${dialOf(country)} ${phone}`,
          topic: 'Traslado',
          date,
          message,
          lang,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && body.ok) setStatus('sent');
      else {
        setStatus('error');
        setError(t.booking.failed);
      }
    } catch {
      setStatus('error');
      setError(t.booking.offline);
    }
  };

  return (
    <section className="section booking-page">
      <div className="container booking-page__inner">
        <div className="booking-page__head">
          <Link className="catalogue__back" to="/">
            <Ico d={ARROW} flip />
            {t.booking.back}
          </Link>
          <p className="eyebrow">{t.booking.step}</p>
          <h1 className="h1 booking-page__title">{t.booking.title}</h1>
          <p className="booking-page__sub">{t.booking.sub}</p>
        </div>

        <form className="booking-form" onSubmit={submit} noValidate>
          <div className="booking-form__main">
            <section className="bcard">
              <h2 className="bcard__title">{t.booking.trip}</h2>

              <div className="bcard__grid">
                <PlaceField
                  id="bk-origin"
                  label={t.booking.origin}
                  placeholder={t.booking.originPh}
                  icon={<Ico d={PIN} size={13} />}
                  groups={TRANSFER_PLACES}
                  value={origin}
                  onChange={setOrigin}
                  google
                />
                <PlaceField
                  id="bk-dest"
                  label={t.booking.destination}
                  placeholder={t.booking.destinationPh}
                  icon={<Ico d={FLAG} size={13} />}
                  groups={TRANSFER_PLACES}
                  value={destination}
                  onChange={setDestination}
                  google
                />
                <label className="form__field">
                  <span>
                    <Ico d={CAL} size={13} />
                    {t.booking.date}
                  </span>
                  <input
                    type="date"
                    className={date ? undefined : 'is-empty'}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label className="form__field">
                  <span>
                    <Ico d={CLOCK2} size={13} />
                    {t.booking.pickupTime}
                  </span>
                  <input
                    type="time"
                    className={time ? undefined : 'is-empty'}
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
                <label className="form__field bcard__full">
                  <span>
                    <Ico d={PLANE} size={13} />
                    {t.booking.flight}
                  </span>
                  <input
                    value={flight}
                    onChange={(e) => setFlight(e.target.value)}
                    placeholder={t.booking.flightPh}
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
                {t.booking.roundTrip}
              </button>

              <AnimatePresence initial={false}>
                {round && (
                  <motion.div
                    className="bcard__return-when"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.32 }}
                  >
                    <div className="bcard__grid">
                      <label className="form__field">
                        <span>
                          <Ico d={CAL} size={13} />
                          {t.booking.returnDate}
                        </span>
                        <input
                          type="date"
                          className={returnDate ? undefined : 'is-empty'}
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                        />
                      </label>
                      <label className="form__field">
                        <span>
                          <Ico d={CLOCK2} size={13} />
                          {t.booking.returnTime}
                        </span>
                        <input
                          type="time"
                          className={returnTime ? undefined : 'is-empty'}
                          value={returnTime}
                          onChange={(e) => setReturnTime(e.target.value)}
                        />
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="bcard">
              <h2 className="bcard__title">{t.booking.who}</h2>
              {(['adults', 'children', 'infants'] as const).map((key) => {
                // En traslados se cobra por vehículo: sin rangos de edad.
                const band = { label: t.passengers.bands[key].label };
                return (
                  <div className="passengers__row" key={key}>
                    <div>
                      <p className="passengers__row-label">{band.label}</p>
                    </div>
                    <Stepper
                      value={party[key]}
                      min={key === 'adults' ? 1 : 0}
                      max={50}
                      onChange={(n) => setParty((p) => ({ ...p, [key]: n }))}
                      label={band.label.toLowerCase()}
                    />
                  </div>
                );
              })}
            </section>

            <section className="bcard">
              <h2 className="bcard__title">{t.booking.vehicle}</h2>
              <p className="bcard__lead">
                {locked ? t.booking.vehicleLockedLead : t.booking.vehicleLead}
              </p>

              {pricing === 'loading' && (
                <p className="passengers__note bcard__hint">{t.booking.routing}</p>
              )}
              {pricing === 'ready' && km != null && (
                <p className="passengers__note bcard__hint">
                  {t.booking.kmLine(km, round, billableKm ?? km)}
                </p>
              )}

              <div className={`vpick${locked ? ' vpick--single' : ''}`}>
                {(locked && chosen ? [chosen] : fleet).map((v) => {
                  const on = vehicle?.slug === v.slug;
                  const q = priceFor(v.slug);
                  return (
                    <button
                      key={v.slug}
                      type="button"
                      className={`vpick__item${on ? ' is-on' : ''}`}
                      onClick={() => setVehicleSlug(v.slug)}
                      aria-pressed={on}
                    >
                      <span className="vpick__media">
                        {v.photo && (
                          <img src={v.photo} alt="" loading="lazy" decoding="async" />
                        )}
                      </span>
                      <span className="vpick__body">
                        <span className="vpick__name">{v.name}</span>
                        <span className="vpick__type">{v.type}</span>
                        <span className="vpick__pax">
                          {v.minPax}–{v.maxPax} {t.booking.passengers}
                        </span>
                        <span className="vpick__price">
                          {q
                            ? `US$${q.total}`
                            : v.price !== null
                              ? t.booking.fromPrice(v.price)
                              : t.booking.toQuote}
                        </span>
                      </span>
                      {suggested?.slug === v.slug && !chosen && (
                        <span className="vpick__tag">{t.booking.suggested}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {locked && (
                <button
                  type="button"
                  className="vpick__change"
                  onClick={() => setLocked(false)}
                >
                  {t.booking.changeVehicle}
                </button>
              )}

              {overCapacity && vehicle && (
                <p className="passengers__note passengers__note--warn bcard__hint">
                  {t.booking.overCapacity(vehicle.name, vehicle.maxPax, total)}
                </p>
              )}
            </section>

            <section className="bcard">
              <h2 className="bcard__title">{t.booking.extras}</h2>
              <p className="bcard__lead">{t.booking.extrasLead}</p>

              <div className="extras">
                <div className="extras__group">
                  <p className="extras__group-title">{t.booking.childSeats}</p>
                  {SEATS.map((seat) => (
                    <div className="extras__row" key={seat.id}>
                      <p className="extras__name">{seat.label}</p>
                      <p className="extras__price">{usd(seat.price)}</p>
                      <Stepper
                        value={extras.seats[seat.id as SeatId]}
                        min={0}
                        max={6}
                        onChange={(n) => setSeat(seat.id as SeatId, n)}
                        label={seat.label.toLowerCase()}
                      />
                    </div>
                  ))}
                </div>

                <div className="extras__group">
                  <p className="extras__group-title">{t.booking.onBoard}</p>
                  {DRINKS.map((drink) => (
                    <div className="extras__row" key={drink.id}>
                      <p className="extras__name">{drink.label}</p>
                      <p className="extras__price">{usd(drink.price)}</p>
                      <Stepper
                        value={extras.drinks[drink.id as DrinkId]}
                        min={0}
                        max={40}
                        onChange={(n) => setDrink(drink.id as DrinkId, n)}
                        label={drink.label.toLowerCase()}
                      />
                    </div>
                  ))}
                </div>

                <div className="extras__group extras__group--wide">
                  <p className="extras__group-title">{t.booking.stops}</p>
                  <p className="extras__group-hint">{t.booking.stopsHint}</p>
                  <div className="stops">
                    {STOPS_T.map((stop) => {
                      const on = extras.stop === stop.id;
                      return (
                        <button
                          key={stop.id}
                          type="button"
                          className={`stop${on ? ' is-on' : ''}`}
                          onClick={() => pickStop(stop.id as StopId)}
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
                          <span className="stop__price">{usd(stop.price)}</span>
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
                    <span>{t.booking.extrasTotal}</span>
                    <strong>{usd(extrasSum)}</strong>
                  </motion.p>
                )}
              </AnimatePresence>

              <label className="form__field bcard__notes">
                <span>{t.booking.notes}</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.booking.notesPh}
                />
              </label>
            </section>
          </div>

          <aside className="booking-form__side">
            <div className="bcard bcard--sticky">
              <h2 className="bcard__title">{t.booking.yourDetails}</h2>

              <label className="form__field">
                <span>{t.booking.name}</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.booking.namePh}
                  autoComplete="name"
                />
              </label>
              <label className="form__field">
                <span>{t.booking.email}</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.booking.emailPh}
                  autoComplete="email"
                />
              </label>
              <PhoneField
                id="bk-phone"
                country={country}
                onCountry={setCountry}
                value={phone}
                onChange={setPhone}
              />

              <dl className="summary">
                <div>
                  <dt>{t.booking.route}</dt>
                  <dd>
                    {origin.text || '—'} → {destination.text || '—'}
                    {round ? ` ${t.booking.roundParen}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>{t.booking.when}</dt>
                  <dd>
                    {uiDate(date) || '—'} {time && `· ${time}`}
                  </dd>
                </div>
                {round && (
                  <div>
                    <dt>{t.booking.return}</dt>
                    <dd>
                      {uiDate(returnDate) || '—'}{' '}
                      {returnTime && `· ${returnTime}`}
                    </dd>
                  </div>
                )}
                {vehicle && (
                  <div>
                    <dt>{t.booking.vehicleRow}</dt>
                    <dd>
                      {vehicle.name}
                      {!chosen && ` ${t.booking.suggestedParen}`}
                    </dd>
                  </div>
                )}
                {chosenQuote && (
                  <div>
                    <dt>{t.booking.price}</dt>
                    <dd>
                      US${chosenQuote.total}
                      {chosenQuote.surcharge && (
                        <>
                          <br />
                          <span className="summary__fine">
                            US${chosenQuote.base} + US${chosenQuote.surcharge.amount}{' '}
                            {chosenQuote.surcharge.label}
                          </span>
                        </>
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{t.booking.passengersRow}</dt>
                  <dd>{partyLabelT(t, party)}</dd>
                </div>
                {extraLinesUi.length > 0 && (
                  <div>
                    <dt>{t.booking.extrasRow}</dt>
                    <dd>
                      {extraLinesUi.join(' · ')}
                      <br />
                      <strong>{usd(extrasSum)}</strong>
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
                {status === 'sending' ? t.booking.sending : t.booking.send}
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
                    {t.booking.sent}
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

              <p className="bcard__fine">{t.booking.fine}</p>
            </div>
          </aside>
        </form>
      </div>
    </section>
  );
}
