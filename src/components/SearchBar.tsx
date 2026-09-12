import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MagneticButton from './MagneticButton';
import PlaceField from './PlaceField';
import PassengersField from './PassengersField';
import { EMPTY_PARTY } from '../data/passengers';
import type { Party } from '../data/passengers';
import { emptyPlace } from '../data/places';
import type { PlaceValue } from '../data/places';
import { EASINGS } from '../utils/easings';
import { useT } from '../i18n';
import { useExcursions, usePickupPlaces, useTransferPlaces } from '../i18n/catalog';

const TABS = ['transfer', 'excursion'] as const;
type Tab = (typeof TABS)[number];

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
export default function SearchBar() {
  const navigate = useNavigate();
  const t = useT();
  const EXCURSIONS = useExcursions();
  const TRANSFER_PLACES = useTransferPlaces();
  const PICKUP_PLACES = usePickupPlaces();
  const EXCURSION_PLACES = [{ label: t.search.tabs.excursion, items: EXCURSIONS.map((e) => e.name) }];
  const [tab, setTab] = useState<Tab>('transfer');
  const [origin, setOrigin] = useState<PlaceValue>(emptyPlace());
  const [destination, setDestination] = useState<PlaceValue>(emptyPlace());
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [party, setParty] = useState<Party>(EMPTY_PARTY);
  /** Campos que faltaban en el ultimo intento de enviar. */
  const [missing, setMissing] = useState<string[]>([]);

  const isTransfer = tab === 'transfer';
  const miss = (k: string) => missing.includes(k);

  // Cambiar de pestana vacia el aviso: lo que faltaba en traslados no tiene
  // por que faltar en excursiones.
  const switchTab = (t: Tab) => {
    setTab(t);
    setMissing([]);
  };

  const submit = () => {
    // Sin esto, "Pedir traslado" con todo vacio abria un formulario en blanco
    // que volvia a pedir lo mismo. El cliente quiere los datos aqui primero.
    const gaps: string[] = [];
    if (!origin.text.trim()) gaps.push('origin');
    if (!destination.text.trim()) gaps.push('destination');
    if (!date) gaps.push('date');
    if (isTransfer && !time) gaps.push('time');
    if (gaps.length > 0) {
      setMissing(gaps);
      const ids: Record<string, string> = {
        origin: 'sb-origin',
        destination: 'sb-dest',
        date: 'sb-date',
        time: 'sb-time',
      };
      document.getElementById(ids[gaps[0]!]!)?.focus();
      return;
    }
    setMissing([]);

    // Transfers get their own page: the client asked for children and the
    // on-board amenities to live there, not crowding the hero bar.
    if (isTransfer) {
      navigate('/reservar', {
        state: { origin, destination, date, time, party },
      });
      return;
    }

    const excursion = EXCURSIONS.find((e) => e.name === destination.text.trim());
    navigate('/reservar-excursion', {
      state: {
        slug: excursion?.slug,
        date,
        party,
        pickup: origin,
      },
    });
  };

  return (
    <motion.div
      className="container search"
      initial={{ opacity: 0, y: 44 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.95, delay: 0.85, ease: EASINGS.premium }}
    >
      <div className="search__tabs" role="tablist" aria-label={t.search.tabsAria}>
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            role="tab"
            aria-selected={tab === tb}
            className={`search__tab${tab === tb ? ' is-active' : ''}`}
            onClick={() => switchTab(tb)}
          >
            {tab === tb && (
              <motion.span
                layoutId="search-tab-pill"
                className="search__tab-pill"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            {t.search.tabs[tb]}
          </button>
        ))}
      </div>

      <div className={`search__bar${missing.length ? ' has-missing' : ''}`}>
        <PlaceField
          id="sb-origin"
          label={isTransfer ? t.search.origin : t.search.pickup}
          placeholder={isTransfer ? t.search.originPh : t.search.pickupPh}
          icon={<PinIcon />}
          groups={isTransfer ? TRANSFER_PLACES : PICKUP_PLACES}
          value={origin}
          onChange={setOrigin}
          google
          invalid={miss('origin')}
        />

        <PlaceField
          id="sb-dest"
          label={isTransfer ? t.search.destination : t.search.excursion}
          placeholder={isTransfer ? t.search.destinationPh : t.search.excursionPh}
          icon={<FlagIcon />}
          groups={isTransfer ? TRANSFER_PLACES : EXCURSION_PLACES}
          value={destination}
          onChange={setDestination}
          google={isTransfer}
          invalid={miss('destination')}
        />

        <div className={`search__field${miss('date') ? ' is-missing' : ''}`}>
          <label className="search__label" htmlFor="sb-date">
            <CalendarIcon />
            {t.search.date}
          </label>
          <input
            id="sb-date"
            type="date"
            className={date ? undefined : 'is-empty'}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className={`search__field${miss('time') ? ' is-missing' : ''}`}>
          <label className="search__label" htmlFor="sb-time">
            <ClockIcon />
            {t.search.time}
          </label>
          <input
            id="sb-time"
            type="time"
            className={time ? undefined : 'is-empty'}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <PassengersField
          value={party}
          onChange={setParty}
          variant={isTransfer ? 'transfer' : 'ages'}
        />

        <div className="search__submit">
          <MagneticButton
            className="btn btn--primary"
            magnetStrength={0.22}
            onClick={submit}
          >
            {isTransfer ? t.search.submitTransfer : t.search.submitExcursion}
            <ArrowIcon />
          </MagneticButton>
        </div>
      </div>

      <div className="search__foot search__foot--single">
        {/* El aviso ocupa el sitio de la nota: al enfocar el origen se abre su
            menu y taparia cualquier cosa puesta a la izquierda. */}
        {missing.length > 0 ? (
          <p className="search__error" role="alert">
            {isTransfer ? t.search.errorTransfer : t.search.errorExcursion}
          </p>
        ) : (
          <p className="search__note">
            <ShieldIcon />
            {isTransfer ? t.search.noteTransfer : t.search.noteExcursion}
          </p>
        )}
      </div>
    </motion.div>
  );
}
