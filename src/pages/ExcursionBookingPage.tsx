import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useCatalog } from '../catalog/CatalogProvider';
import MagneticButton from '../components/MagneticButton';
import PlaceField from '../components/PlaceField';
import PhoneField, { DEFAULT_COUNTRY, dialOf } from '../components/PhoneField';
import LegalConsent from '../components/LegalConsent';
import { withTax } from '../data/tax';
import PayPalCheckout from '../components/PayPalCheckout';
import { useSettings } from '../catalog/CatalogProvider';
import ExcursionCarousel from '../components/ExcursionCarousel';
import { basePrice, fromPrice } from '../data/excursions';
import { AGE_BANDS, EMPTY_PARTY, partyLabel, partyTotal, usd } from '../data/passengers';
import type { Party } from '../data/passengers';
import { emptyPlace, placeMapsUrl } from '../data/places';
import type { PlaceGroup, PlaceValue } from '../data/places';
import { useLang } from '../i18n';
import {
  partyLabelT,
  prettyDateT,
  useCategories,
  useExcursions,
  useExcursionsEs,
  usePickupPlaces,
} from '../i18n/catalog';

/** Lo que dejan la ficha de excursión o el buscador al navegar hasta aquí. */
export interface ExcursionSeed {
  slug?: string;
  date?: string;
  party?: Party;
  pickup?: PlaceValue;
}

type Status = 'idle' | 'sending' | 'sent' | 'error' | 'paid' | 'pending' | 'cash';

/** Máximo por salida; para grupos mayores el cliente coordina aparte. */
const MAX_PARTY = 50;

const BAND_KEYS = ['adults', 'children', 'infants'] as const;

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

const CAL = 'M4.5 6.5h15v14h-15zM4.5 11h15M9 3.5v4m6-4v4';
const DOOR = 'M6.5 3.5h11v17h-11zM14 12h.6';

/** Para el correo al operador, siempre dd/mm/aaaa. */
const prettyDate = (iso: string) => prettyDateT('es', iso);

export default function ExcursionBookingPage() {
  const params = useParams<{ slug?: string }>();
  const seed = { ...((useLocation().state ?? {}) as ExcursionSeed), ...(params.slug ? { slug: params.slug } : {}) };
  const { lang, t } = useLang();
  const catalogLive = useCatalog().live;
  const EXCURSIONS = useExcursions();
  const EXCURSIONS_ES = useExcursionsEs();
  const CATEGORIES = useCategories();
  const PICKUP_PLACES = usePickupPlaces();
  const seeded = seed.slug ? EXCURSIONS.find((e) => e.slug === seed.slug) : undefined;
  // /excursiones/lo-que-sea con un slug que no existe (ya con el catálogo
  // real cargado) manda al catálogo en vez de a un formulario vacío.
  const unknownSlug = Boolean(params.slug) && catalogLive && !seeded;

  // El desplegable va agrupado por categoría: con 38 excursiones, una lista
  // plana obliga a leerlas todas para encontrar la que se busca.
  const EXCURSION_GROUPS: PlaceGroup[] = useMemo(
    () =>
      CATEGORIES.filter((c) => c.id !== 'todas')
        .map((c) => ({
          label: c.label,
          items: EXCURSIONS.filter((e) => e.category === c.id).map((e) => e.name),
        }))
        .filter((g) => g.items.length > 0),
    [CATEGORIES, EXCURSIONS],
  );

  const BANDS = BAND_KEYS.map((key) => ({
    key,
    ...t.passengers.bands[key],
    min: key === 'adults' ? 1 : 0,
  }));

  const [choice, setChoice] = useState<PlaceValue>(
    seeded ? emptyPlace(seeded.name) : emptyPlace(),
  );
  const [date, setDate] = useState(seed.date ?? '');
  const [departure, setDeparture] = useState('');
  // Por posición, no por nombre: el cliente crea opciones con el mismo nombre
  // ("Traslado Privado" a $140 y a $180) y por nombre se marcaban las dos.
  const [ticket, setTicket] = useState<number | null>(null);
  const [pickup, setPickup] = useState<PlaceValue>(seed.pickup ?? emptyPlace());
  const [room, setRoom] = useState('');
  const [party, setParty] = useState<Party>(seed.party ?? EMPTY_PARTY);
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [pay, setPay] = useState<{ amount: number; bookingId: number | null }>({ amount: 0, bookingId: null });
  const [payOn, setPayOn] = useState(false);

  /** Reserva con pago en efectivo el día del servicio: se registra y avisa. */
  const payCash = async () => {
    if (status === 'sending') return;
    const miss = missingContact();
    if (miss) {
      setStatus('error');
      setError(miss);
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/pay/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(), bookingId: pay.bookingId }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; bookingId?: number; amount?: number; error?: string };
      if (res.ok && body.ok) {
        setPay({ amount: body.amount ?? 0, bookingId: body.bookingId ?? null });
        setStatus('cash');
      } else {
        setStatus('error');
        setError(body.error || t.exBooking.failed);
      }
    } catch {
      setStatus('error');
      setError(t.exBooking.offline);
    }
  };
  const settings = useSettings();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    document.title = seeded ? `${seeded.name} — Dominican Routes` : t.titles.excursion;
  }, [t, seeded]);

  // Si el texto coincide con una del catálogo mostramos sus datos; si no,
  // vale igual, porque el cliente también arma salidas a medida.
  const excursion = useMemo(
    () => EXCURSIONS.find((e) => e.name === choice.text.trim()),
    [choice.text, EXCURSIONS],
  );
  // Al cambiar de idioma el nombre elegido cambia con el catálogo, para que
  // el formulario no se quede apuntando a un texto que ya no existe. Se
  // recuerda el slug porque el nombre viejo ya no está en la lista nueva.
  // Arranca con el slug pedido (URL o estado), no con el encontrado: las
  // excursiones creadas desde el panel no están en el catálogo empaquetado
  // con el que se pinta el primer render, y solo aparecen cuando llega
  // /api/catalog; el efecto de abajo las selecciona entonces.
  const lastSlug = useRef<string | undefined>(seed.slug);
  if (excursion) lastSlug.current = excursion.slug;
  useEffect(() => {
    const here = lastSlug.current ? EXCURSIONS.find((e) => e.slug === lastSlug.current) : undefined;
    if (here) setChoice((c) => (c.text.trim() === here.name ? c : emptyPlace(here.name)));
  }, [EXCURSIONS]);
  // Para el correo al operador: la ficha en español.
  const excursionEs = excursion ? EXCURSIONS_ES.find((e) => e.slug === excursion.slug) : undefined;

  const adultsOnly = Boolean(excursion?.adultsOnly);
  const departures = excursion?.departures ?? [];
  const tickets = excursion?.tickets ?? [];
  const chosenTicket = ticket != null ? (tickets[ticket] ?? null) : null;
  const chosenTicketEs = chosenTicket && ticket != null ? (excursionEs?.tickets?.[ticket] ?? chosenTicket) : null;

  // Cambiar de excursion deja el horario y la entrada de la anterior, que no
  // existen en la nueva.
  useEffect(() => {
    setDeparture('');
    setTicket(null);
  }, [excursion?.slug]);
  // Elegir una excursion de solo adultos con ninos ya contados dejaria el
  // correo pidiendo plazas que no existen.
  useEffect(() => {
    if (adultsOnly) setParty((p) => ({ ...p, children: 0, infants: 0 }));
  }, [adultsOnly]);

  // Con barra libre el tramo de adultos no es el del catalogo, que empieza a
  // los 11: decir "solo para mayores" y debajo "11 anos o mas" se contradice.
  // Precio unitario: el de la entrada elegida (o la más barata) para adultos y
  // el de niño de la ficha. Ninguno es obligatorio; sin ellos no hay estimado.
  const adultUnit = chosenTicket ? chosenTicket.price : excursion ? fromPrice(excursion) : null;
  const childUnit = adultsOnly ? null : (excursion?.childPrice ?? null);
  const estimate =
    excursion && adultUnit != null && (party.children === 0 || childUnit != null)
      ? adultUnit * party.adults + (childUnit ?? 0) * party.children
      : null;
  const bill = estimate != null ? withTax(estimate) : null;

  const bands = adultsOnly
    ? [{ ...BANDS[0]!, hint: t.passengers.adultsOnlyHint }]
    : BANDS.map((b) =>
        b.key === 'children' && childUnit != null ? { ...b, hint: `${b.hint} · ${t.exBooking.perChild(childUnit)}` } : b,
      );
  const total = partyTotal(party);
  const atMax = total >= MAX_PARTY;
  const pickupMap = placeMapsUrl(pickup);

  const step = (key: keyof Party, delta: number) => {
    if (delta > 0 && atMax) return;
    const band = BANDS.find((b) => b.key === key)!;
    setParty((p) => ({ ...p, [key]: Math.max(band.min, p[key] + delta) }));
  };

  // El formulario lleva noValidate, asi que `required` no lo aplica el
  // navegador: hay que comprobarlo aqui o el telefono se colaria vacio.
  const missingContact = () =>
    !name.trim() || !email.trim() || !phone.trim() ? t.exBooking.missingContact : null;

  /** Lo que se manda al servidor, igual para la solicitud y para el cobro. */
  const buildPayload = () => {

    // Los tramos van desglosados y con su rango de edad al lado: es
    // exactamente lo que el operador necesita para cotizar la salida.
    const blocks = [
      [
        'Solicitud de excursión.',
        ...(lang === 'en' ? ['Idioma del cliente: inglés (reservó desde la web en inglés).'] : []),
      ],
      [
        `Excursión: ${excursionEs?.name || choice.text || '(por confirmar)'}${
          excursionEs ? ` (${excursionEs.duration})` : ''
        }`,
        `Fecha: ${prettyDate(date) || '(por confirmar)'}`,
        ...(departures.length
          ? [`Horario de salida: ${departure || '(por confirmar)'}`]
          : []),
        ...(chosenTicketEs
          ? [
              `Entrada: ${chosenTicketEs.name} — $${chosenTicketEs.price} por persona`,
              `  Incluye: ${chosenTicketEs.includes}`,
            ]
          : tickets.length
            ? ['Entrada: (por confirmar)']
            : []),
        `Punto de recogida: ${pickup.text || '(por confirmar)'}`,
        ...(pickup.address ? [`  Dirección: ${pickup.address}`] : []),
        ...(pickupMap ? [`  Ubicación exacta: ${pickupMap}`] : []),
        ...(room ? [`Número de habitación: ${room}`] : []),
      ],
      adultsOnly
        ? [
            `Pasajeros: ${party.adults} ${party.adults === 1 ? 'adulto' : 'adultos'}`,
            '  Experiencia solo para mayores de edad.',
          ]
        : [
            `Pasajeros: ${partyLabel(party)}`,
            `  ${AGE_BANDS.adults.label} (${AGE_BANDS.adults.hint}): ${party.adults}`,
            `  ${AGE_BANDS.children.label} (${AGE_BANDS.children.hint}): ${party.children}`,
            `  ${AGE_BANDS.infants.label} (${AGE_BANDS.infants.hint}): ${party.infants}`,
          ],
      ...(estimate != null
        ? [
            [
              `Precio estimado por la web: US$${estimate}`,
              `  Impuestos (5 %, solo PayPal/tarjeta): ${usd(bill!.tax)}`,
              `  TOTAL CON PAYPAL/TARJETA: ${usd(bill!.total)}`,
              ...(excursion?.cashAllowed !== false ? [`  TOTAL EN EFECTIVO: ${usd(bill!.subtotal)}`] : []),
              `  ${party.adults} × US$${adultUnit} por adulto${
                party.children ? ` + ${party.children} × US$${childUnit} por niño` : ''
              }${party.infants ? ` (${party.infants} infante${party.infants > 1 ? 's' : ''} sin cargo)` : ''}`,
            ],
          ]
        : []),
      ...(notes ? [[`Notas: ${notes}`]] : []),
    ];

    const message = blocks
      .map((b) => b.join(String.fromCharCode(10)))
      .join(String.fromCharCode(10, 10));

    return {
          name,
          email,
          phone: `${dialOf(country)} ${phone}`,
          topic: 'Excursión',
          date,
          message,
          lang,
          // Los mismos datos, sueltos, para el panel.
          booking: {
            excursion: excursionEs ? { slug: excursionEs.slug, name: excursionEs.name } : { slug: null, name: choice.text },
            date,
            departure,
            ticket: chosenTicketEs ? { index: ticket, name: chosenTicketEs.name, price: chosenTicketEs.price } : null,
            pickup,
            room,
            party,
            adultsOnly,
            adultPrice: adultUnit,
            childPrice: childUnit,
            estimate,
            notes,
          },
    };
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (status === 'sending') return;
    const miss = missingContact();
    if (miss) {
      setStatus('error');
      setError(miss);
      return;
    }

    setStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Si ya se registró al intentar pagar, se reutiliza esa reserva (y
        // ahora sí sale el correo, que con PayPal se guarda para el cobro).
        body: JSON.stringify({ ...buildPayload(), bookingId: pay.bookingId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && body.ok) setStatus('sent');
      else {
        setStatus('error');
        setError(t.exBooking.failed);
      }
    } catch {
      setStatus('error');
      setError(t.exBooking.offline);
    }
  };

  if (unknownSlug) return <Navigate to="/excursiones" replace />;

  return (
    <section className="section booking-page">
      <div className="container booking-page__inner">
        <div className="booking-page__head">
          <Link className="catalogue__back" to="/excursiones">
            <Ico d={ARROW} flip />
            {t.exBooking.back}
          </Link>
          <p className="eyebrow">
            {excursion
              ? (CATEGORIES.find((c) => c.id === excursion.category)?.label ??
                t.exBooking.eyebrow)
              : t.exBooking.eyebrow}
          </p>
          <h1 className="h1 booking-page__title">{t.exBooking.title}</h1>
          <p className="booking-page__sub">{t.exBooking.sub}</p>
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
                {excursion ? excursion.name : t.exBooking.theExcursion}
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
                      {excursion.rating.toFixed(1)} · {excursion.reviews} {t.exBooking.reviews}
                    </span>
                    <span className="exdetail__fact">
                      <Ico d={PIN} size={15} />
                      Punta Cana
                    </span>
                    <span className="exdetail__fact">
                      <Ico d={COIN} size={15} />
                      {fromPrice(excursion) === null
                        ? t.exBooking.toQuote
                        : t.exBooking.fromPerAdult(fromPrice(excursion)!)}
                    </span>
                  </div>

                  <p className="exdetail__desc">{excursion.description}</p>

                  {excursion.includes.length > 0 && (
                    <>
                      <h3 className="exdetail__sub">{t.exBooking.includes}</h3>
                      <ul className="exdetail__list">
                        {excursion.includes.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {excursion.activities.length > 0 && (
                    <>
                      <h3 className="exdetail__sub">{t.exBooking.activities}</h3>
                      <ul className="exdetail__list exdetail__list--act">
                        {excursion.activities.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              <div className="bcard__grid">
                <div className="bcard__full">
                  <PlaceField
                    id="ex-choice"
                    label={t.exBooking.excursion}
                    placeholder={t.exBooking.excursionPh}
                    icon={<Ico d={COMPASS} size={13} />}
                    groups={EXCURSION_GROUPS}
                    value={choice}
                    onChange={setChoice}
                  />
                </div>

                <label className="form__field bcard__full">
                  <span>
                    <Ico d={CAL} size={13} />
                    {t.exBooking.date}
                  </span>
                  <input
                    type="date"
                    className={date ? undefined : 'is-empty'}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>

                {departures.length > 0 && (
                  <div className="bcard__full">
                    <p className="opt__label">{t.exBooking.departure}</p>
                    <div className="opt">
                      {departures.map((h) => (
                        <button
                          key={h}
                          type="button"
                          className={`opt__pill${departure === h ? ' is-on' : ''}`}
                          onClick={() => setDeparture(departure === h ? '' : h)}
                          aria-pressed={departure === h}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bcard__full">
                  <PlaceField
                    id="ex-pickup"
                    label={t.exBooking.pickup}
                    placeholder={t.exBooking.pickupPh}
                    icon={<Ico d={PIN} size={13} />}
                    groups={PICKUP_PLACES}
                    value={pickup}
                    onChange={setPickup}
                    google
                  />
                </div>

                <label className="form__field bcard__full">
                  <span>
                    <Ico d={DOOR} size={13} />
                    {t.exBooking.room}
                  </span>
                  <input
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder={t.exBooking.roomPh}
                  />
                </label>
              </div>
            </section>

            {tickets.length > 0 && (
              <section className="bcard">
                <h2 className="bcard__title">{excursion?.ticketsTitle || t.exBooking.ticket}</h2>
                <p className="bcard__lead">{excursion?.ticketsLead || t.exBooking.ticketLead}</p>
                <div className="tickets">
                  {/* La excursión a su precio normal, como una opción más: sin
                      esto parecía que solo se podía reservar lo de abajo. */}
                  {excursion && basePrice(excursion) != null && !tickets.some((tk) => tk.price === basePrice(excursion)) && (
                    <button
                      type="button"
                      className={`ticket${ticket === null ? ' is-on' : ''}`}
                      onClick={() => setTicket(null)}
                      aria-pressed={ticket === null}
                    >
                      <span className="ticket__head">
                        <span className="ticket__name">{t.exBooking.standardOption}</span>
                        <span className="ticket__price">${basePrice(excursion)}</span>
                      </span>
                      <span className="ticket__includes">{t.exBooking.standardOptionNote}</span>
                    </button>
                  )}
                  {tickets.map((tk, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`ticket${ticket === i ? ' is-on' : ''}`}
                      onClick={() => setTicket(i)}
                      aria-pressed={ticket === i}
                    >
                      <span className="ticket__head">
                        <span className="ticket__name">{tk.name}</span>
                        <span className="ticket__price">${tk.price}</span>
                      </span>
                      <span className="ticket__includes">{tk.includes}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="bcard">
              <h2 className="bcard__title">{t.exBooking.who}</h2>
              <p className="bcard__lead">
                {adultsOnly ? t.exBooking.adultsOnlyLead : t.exBooking.agesLead}
              </p>

              {bands.map((band) => {
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
                        aria-label={`${t.passengers.less} ${band.label.toLowerCase()}`}
                      >
                        –
                      </button>
                      <strong aria-live="polite">{n}</strong>
                      <button
                        type="button"
                        onClick={() => step(band.key, 1)}
                        disabled={atMax}
                        aria-label={`${t.passengers.more} ${band.label.toLowerCase()}`}
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
                {atMax
                  ? t.exBooking.maxNote(MAX_PARTY)
                  : adultsOnly
                    ? t.exBooking.adultsOnlyNote(excursion?.name ?? '')
                    : t.exBooking.agesNote}
              </p>

              <label className="form__field bcard__notes">
                <span>{t.exBooking.notes}</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.exBooking.notesPh}
                />
              </label>
            </section>
          </div>

          <aside className="booking-form__side">
            <div className="bcard bcard--sticky">
              <h2 className="bcard__title">{t.exBooking.yourDetails}</h2>

              <label className="form__field">
                <span>{t.exBooking.name}</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.exBooking.namePh}
                  autoComplete="name"
                />
              </label>
              <label className="form__field">
                <span>{t.exBooking.email}</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.exBooking.emailPh}
                  autoComplete="email"
                />
              </label>
              <PhoneField
                id="ex-phone"
                country={country}
                onCountry={setCountry}
                value={phone}
                onChange={setPhone}
              />

              <dl className="summary">
                <div>
                  <dt>{t.exBooking.excursionRow}</dt>
                  <dd>{choice.text || '—'}</dd>
                </div>
                <div>
                  <dt>{t.exBooking.when}</dt>
                  <dd>{prettyDateT(lang, date) || '—'}</dd>
                </div>
                {departures.length > 0 && (
                  <div>
                    <dt>{t.exBooking.departureRow}</dt>
                    <dd>{departure || '—'}</dd>
                  </div>
                )}
                {tickets.length > 0 && (
                  <div>
                    <dt>{t.exBooking.ticketRow}</dt>
                    <dd>
                      {chosenTicket
                        ? `${chosenTicket.name} · $${chosenTicket.price}`
                        : '—'}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{t.exBooking.pickupRow}</dt>
                  <dd>{pickup.text || '—'}</dd>
                </div>
                <div>
                  <dt>{t.exBooking.passengersRow}</dt>
                  <dd>{partyLabelT(t, party)}</dd>
                </div>
                {bill && (
                  <>
                    <div>
                      <dt>{t.exBooking.estimate}</dt>
                      <dd>
                        {usd(bill.subtotal)}
                        <br />
                        <span className="summary__fine">{t.exBooking.estimateNote}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>{t.pay.taxRow}</dt>
                      <dd>
                        {usd(bill.tax)}
                        <br />
                        <span className="summary__fine">{t.pay.taxNote}</span>
                      </dd>
                    </div>
                    <div className="summary__total">
                      <dt>{t.pay.totalRow}</dt>
                      <dd>{usd(bill.total)}</dd>
                    </div>
                    {excursion?.cashAllowed !== false && (
                      <div className="summary__total summary__total--cash">
                        <dt>{t.pay.cashRow}</dt>
                        <dd>{usd(bill.subtotal)}</dd>
                      </div>
                    )}
                  </>
                )}
              </dl>

              {status === 'paid' || status === 'pending' || status === 'cash' ? null : estimate != null && excursion ? (
                <PayPalCheckout
                  amount={bill!.total}
                  buildPayload={buildPayload}
                  validate={missingContact}
                  sending={status === 'sending'}
                  bookingId={pay.bookingId}
                  onReady={setPayOn}
                  cashAllowed={excursion?.cashAllowed !== false}
                  cashAmount={bill!.subtotal}
                  onCash={payCash}
                  busy={status === 'sending'}
                  fallback={
                    <MagneticButton
                      className="btn btn--primary btn--block"
                      block
                      type="submit"
                      magnetStrength={0.14}
                      disabled={status === 'sending'}
                    >
                      {status === 'sending' ? t.exBooking.sending : t.exBooking.send}
                      {status !== 'sending' && <Ico d={ARROW} />}
                    </MagneticButton>
                  }
                  onPlainSubmit={() => submit()}
                  onOutcome={(o) => {
                    if (o.kind === 'paid') {
                      setPay({ amount: o.amount, bookingId: o.bookingId });
                      setStatus('paid');
                    } else {
                      setPay({ amount: bill!.total, bookingId: o.bookingId });
                      setStatus('pending');
                    }
                  }}
                />
              ) : null}
              {status !== 'paid' && status !== 'pending' && status !== 'cash' && !(estimate != null && excursion) && (
                <MagneticButton
                  className="btn btn--primary btn--block"
                  block
                  type="submit"
                  magnetStrength={0.14}
                  disabled={status === 'sending'}
                >
                  {status === 'sending' ? t.exBooking.sending : t.exBooking.send}
                  {status !== 'sending' && <Ico d={ARROW} />}
                </MagneticButton>
              )}

              <AnimatePresence mode="wait">
                {status === 'paid' && (
                  <motion.div key="paid" className="pay-result pay-result--ok" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <strong>{t.pay.paidTitle}</strong>
                    <p>{t.pay.paid(pay.amount, pay.bookingId ?? 0)}</p>
                  </motion.div>
                )}
                {status === 'cash' && (
                  <motion.div key="cash" className="pay-result pay-result--ok" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <strong>{t.pay.cashSentTitle}</strong>
                    <p>{t.pay.cashSent(pay.amount, pay.bookingId ?? 0)}</p>
                  </motion.div>
                )}
                {status === 'pending' && (
                  <motion.div key="pending" className="pay-result pay-result--warn" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <strong>{t.pay.pendingTitle}</strong>
                    <p>{t.pay.pending(pay.bookingId ?? 0)}</p>
                    <div className="pay-result__actions">
                      <button type="button" className="btn btn--primary" onClick={() => setStatus('idle')}>
                        {t.pay.retry}
                      </button>
                      <a
                        className="btn btn--ghost-dark"
                        href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(t.pay.whatsappText(pay.bookingId ?? 0))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t.pay.whatsapp}
                      </a>
                    </div>
                  </motion.div>
                )}
                {status === 'sent' && (
                  <motion.p
                    key="ok"
                    className="form__note form__note--ok"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Ico d="M20 6 9 17l-5-5" size={16} />
                    {t.exBooking.sent}
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

              <p className="bcard__fine">{payOn && status !== 'paid' && status !== 'cash' ? t.pay.fine : t.exBooking.fine}</p>
              {status !== 'paid' && status !== 'cash' && status !== 'sent' && <LegalConsent className="bcard__fine" />}
            </div>
          </aside>
        </form>
      </div>
    </section>
  );
}
