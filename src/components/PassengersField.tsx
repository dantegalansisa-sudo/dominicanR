import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FLEET } from '../data/fleet';
import { partyTotal } from '../data/passengers';
import type { Party } from '../data/passengers';
import { useT } from '../i18n';

const MAX_TOTAL = Math.max(...FLEET.filter((v) => v.standard).map((v) => v.maxPax));

/**
 * Smallest standard vehicle that still fits the whole group. Only standard ones
 * qualify: suggesting the wheelchair-adapted van to a family of four just
 * because it seats four would be wrong, and the limo is a choice, not a size.
 */
export function suggestVehicle(total: number) {
  return (
    FLEET.filter((v) => v.standard)
      .sort((a, b) => a.maxPax - b.maxPax)
      .find((v) => v.maxPax >= total) ?? null
  );
}

const KEYS = ['adults', 'children', 'infants'] as const;

interface PassengersFieldProps {
  value: Party;
  onChange: (p: Party) => void;
  /**
   * Ambos reparten el grupo en los tres tramos; lo que cambia es si se enseñan
   * los rangos de edad, que en traslados no vienen a cuento porque el precio
   * es por vehiculo.
   */
  variant?: 'transfer' | 'ages';
}

export default function PassengersField({
  value,
  onChange,
  variant = 'ages',
}: PassengersFieldProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const t = useT();

  // En excursiones cada tramo tiene su tarifa, asi que el rango de edad
  // importa; en traslados se cobra por vehiculo y solo cuenta cuanta gente sube.
  const rows = KEYS.map((key) => ({
    key,
    label: t.passengers.bands[key].label,
    hint: variant === 'transfer' ? '' : t.passengers.bands[key].hint,
    min: key === 'adults' ? 1 : 0,
  }));

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const total = partyTotal(value);
  const atMax = total >= MAX_TOTAL;

  const step = (key: keyof Party, delta: number) => {
    if (delta > 0 && atMax) return;
    const row = rows.find((r) => r.key === key);
    const min = row ? row.min : 0;
    onChange({ ...value, [key]: Math.max(min, value[key] + delta) });
  };

  return (
    <div className="search__field passengers" ref={wrapRef}>
      <span className="search__label">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="9" cy="8" r="3.4" />
          <path d="M3 20a6 6 0 0 1 12 0M16.5 5.2a3.4 3.4 0 0 1 0 5.6M18 20a6 6 0 0 0-2.2-4.6" />
        </svg>
        {t.passengers.label}
      </span>

      <button
        type="button"
        className="passengers__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="passengers__count">
          {total} {total === 1 ? t.passengers.one : t.passengers.many}
        </span>
        {(value.children > 0 || value.infants > 0) && (
          <span className="passengers__break">
            {value.adults}{t.passengers.initials.adults}
            {value.children > 0 ? ` · ${value.children}${t.passengers.initials.children}` : ''}
            {value.infants > 0 ? ` · ${value.infants}${t.passengers.initials.infants}` : ''}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="passengers__panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {rows.map((row) => {
              const n = value[row.key];
              return (
                <div className="passengers__row" key={row.key}>
                  <div>
                    <p className="passengers__row-label">{row.label}</p>
                    {row.hint && (
                      <p className="passengers__row-hint">{row.hint}</p>
                    )}
                  </div>
                  <div className="passengers__stepper">
                    <button
                      type="button"
                      onClick={() => step(row.key, -1)}
                      disabled={n <= row.min}
                      aria-label={`${t.passengers.less} ${row.label.toLowerCase()}`}
                    >
                      –
                    </button>
                    <strong aria-live="polite">{n}</strong>
                    <button
                      type="button"
                      onClick={() => step(row.key, 1)}
                      disabled={atMax}
                      aria-label={`${t.passengers.more} ${row.label.toLowerCase()}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="passengers__foot">
              {atMax ? (
                <p className="passengers__note passengers__note--warn">
                  {t.passengers.maxNote(MAX_TOTAL)}
                </p>
              ) : variant === 'transfer' ? (
                <p className="passengers__note">{t.passengers.transferNote}</p>
              ) : (
                <p className="passengers__note">{t.passengers.agesNote}</p>
              )}

              <button
                type="button"
                className="passengers__done"
                onClick={() => setOpen(false)}
              >
                {t.passengers.done}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
