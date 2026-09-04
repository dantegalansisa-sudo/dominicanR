import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MagneticButton from './MagneticButton';
import PlaceField from './PlaceField';
import PassengersField from './PassengersField';
import { EMPTY_PARTY, partyLabel } from '../data/passengers';
import type { Party } from '../data/passengers';
import { PICKUP_PLACES, TRANSFER_PLACES } from '../data/places';
import { EXCURSIONS } from '../data/excursions';
import { EASINGS } from '../utils/easings';

const TABS = ['Traslado', 'Excursiones'] as const;
type Tab = (typeof TABS)[number];

const EXCURSION_PLACES = [
  { label: 'Excursiones', items: EXCURSIONS.map((e) => e.name) },
];

const ico = {
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const PinIcon = () => (
  <svg {...ico} aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

const FlagIcon = () => (
  <svg {...ico} aria-hidden="true">
    <path d="M5 21V4m0 0h11l-2 3.5L16 11H5" />
  </svg>
);

const CalendarIcon = () => (
  <svg {...ico} aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 3v4m8-4v4" />
  </svg>
);

const ClockIcon = () => (
  <svg {...ico} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </svg>
);

const ShieldIcon = () => (
  <svg {...ico} width="14" height="14" aria-hidden="true">
    <path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    className="btn__arrow"
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Horizontal search rail. Submitting does not fake a results page — it hands
 * everything to the contact form, which is where the business actually wants
 * the request to land.
 */
export default function SearchBar({
  onSearch,
}: {
  onSearch: (topic: string, message: string) => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('Traslado');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [party, setParty] = useState<Party>(EMPTY_PARTY);
  const [round, setRound] = useState(false);

  const isTransfer = tab === 'Traslado';

  // ISO reads like a database row in an email; give the operator dd/mm/aaaa.
  const prettyDate = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
  };

  const submit = () => {
    // Transfers get their own page: the client asked for children and the
    // on-board amenities to live there, not crowding the hero bar.
    if (isTransfer) {
      navigate('/reservar', {
        state: { origin, destination, date, time, adults: party.adults, round },
      });
      return;
    }

    const lines = [
      'Quiero reservar una excursión.',
      '',
      `Punto de recogida: ${origin || '(por confirmar)'}`,
      `Excursión: ${destination || '(por confirmar)'}`,
      `Fecha: ${prettyDate(date) || '(por confirmar)'}`,
      `Hora: ${time || '(por confirmar)'}`,
      `Pasajeros: ${partyLabel(party)}`,
    ];
    if (party.infants > 0) lines.push('Los infantes (0 a 4 años) no pagan.');

    onSearch('Excursión', lines.join('\n'));
  };

  return (
    <motion.div
      className="container search"
      initial={{ opacity: 0, y: 44 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.95, delay: 0.85, ease: EASINGS.premium }}
    >
      <div className="search__tabs" role="tablist" aria-label="Tipo de reserva">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`search__tab${tab === t ? ' is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {tab === t && (
              <motion.span
                layoutId="search-tab-pill"
                className="search__tab-pill"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            {t}
          </button>
        ))}
      </div>

      <div className="search__bar">
        <PlaceField
          id="sb-origin"
          label={isTransfer ? 'Origen' : 'Punto de recogida'}
          placeholder={isTransfer ? 'Aeropuerto, hotel o zona' : 'Tu hotel o zona'}
          icon={<PinIcon />}
          groups={isTransfer ? TRANSFER_PLACES : PICKUP_PLACES}
          value={origin}
          onChange={setOrigin}
        />

        <PlaceField
          id="sb-dest"
          label={isTransfer ? 'Destino' : 'Excursión'}
          placeholder={isTransfer ? 'Hotel, zona o dirección' : 'Elige una excursión'}
          icon={<FlagIcon />}
          groups={isTransfer ? TRANSFER_PLACES : EXCURSION_PLACES}
          value={destination}
          onChange={setDestination}
        />

        <div className="search__field">
          <label className="search__label" htmlFor="sb-date">
            <CalendarIcon />
            Fecha
          </label>
          <input
            id="sb-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="search__field">
          <label className="search__label" htmlFor="sb-time">
            <ClockIcon />
            Hora
          </label>
          <input
            id="sb-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <PassengersField
          value={party}
          onChange={setParty}
          variant={isTransfer ? 'adults' : 'ages'}
        />

        <div className="search__submit">
          <MagneticButton
            className="btn btn--primary"
            magnetStrength={0.22}
            onClick={submit}
          >
            {isTransfer ? 'Pedir traslado' : 'Pedir excursión'}
            <ArrowIcon />
          </MagneticButton>
        </div>
      </div>

      <div className="search__foot">
        {isTransfer ? (
          <button
            type="button"
            className="search__return"
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
            Agregar regreso
          </button>
        ) : (
          <span />
        )}

        <p className="search__note">
          <ShieldIcon />
          {isTransfer
            ? 'Niños y amenidades en el siguiente paso · Cancelación gratuita'
            : 'Los infantes no pagan · Confirmación por correo · Cancelación gratuita'}
        </p>
      </div>
    </motion.div>
  );
}
