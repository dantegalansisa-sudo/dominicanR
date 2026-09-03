import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FLEET } from '../data/fleet';

export interface Party {
  adults: number;
  children: number;
  infants: number;
  /** Car seats requested; never more than the number of infants. */
  babySeats: number;
}

export const EMPTY_PARTY: Party = {
  adults: 2,
  children: 0,
  infants: 0,
  babySeats: 0,
};

const MAX_TOTAL = Math.max(...FLEET.filter((v) => v.standard).map((v) => v.maxPax));

export const partyTotal = (p: Party) => p.adults + p.children + p.infants;

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

/** Seats are reported on their own line, so they stay out of this. */
export function partyLabel(p: Party) {
  const bits = [`${p.adults} ${p.adults === 1 ? 'adulto' : 'adultos'}`];
  if (p.children) bits.push(`${p.children} ${p.children === 1 ? 'niño' : 'niños'}`);
  if (p.infants) bits.push(`${p.infants} ${p.infants === 1 ? 'bebé' : 'bebés'}`);
  return bits.join(', ');
}

const ROWS = [
  { key: 'adults', label: 'Adultos', hint: '13 años o más', min: 1 },
  { key: 'children', label: 'Niños', hint: 'De 2 a 12 años', min: 0 },
  { key: 'infants', label: 'Bebés', hint: 'Menores de 2 años', min: 0 },
] as const;

export default function PassengersField({
  value,
  onChange,
}: {
  value: Party;
  onChange: (p: Party) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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
  const vehicle = suggestVehicle(total);

  const step = (key: keyof Party, delta: number) => {
    const next: Party = { ...value };
    const row = ROWS.find((r) => r.key === key);
    const min = row ? row.min : 0;

    if (key === 'babySeats') {
      next.babySeats = Math.min(value.infants, Math.max(0, value.babySeats + delta));
      onChange(next);
      return;
    }

    // Adding anyone must respect the capacity of the biggest vehicle.
    if (delta > 0 && total >= MAX_TOTAL) return;

    next[key] = Math.max(min, (value[key] as number) + delta);

    // Fewer babies than seats would be nonsense, so the seats follow them down.
    if (key === 'infants') next.babySeats = Math.min(next.babySeats, next.infants);

    onChange(next);
  };

  const atMax = total >= MAX_TOTAL;

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
        Pasajeros
      </span>

      <button
        type="button"
        className="passengers__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="passengers__count">
          {total} {total === 1 ? 'pasajero' : 'pasajeros'}
        </span>
        {(value.children > 0 || value.infants > 0) && (
          <span className="passengers__break">
            {value.adults}A
            {value.children > 0 ? ` · ${value.children}N` : ''}
            {value.infants > 0 ? ` · ${value.infants}B` : ''}
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
            {ROWS.map((row) => {
              const n = value[row.key];
              return (
                <div className="passengers__row" key={row.key}>
                  <div>
                    <p className="passengers__row-label">{row.label}</p>
                    <p className="passengers__row-hint">{row.hint}</p>
                  </div>
                  <div className="passengers__stepper">
                    <button
                      type="button"
                      onClick={() => step(row.key, -1)}
                      disabled={n <= row.min}
                      aria-label={`Menos ${row.label.toLowerCase()}`}
                    >
                      –
                    </button>
                    <strong aria-live="polite">{n}</strong>
                    <button
                      type="button"
                      onClick={() => step(row.key, 1)}
                      disabled={atMax}
                      aria-label={`Más ${row.label.toLowerCase()}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Only worth asking once there is actually a baby travelling. */}
            <AnimatePresence>
              {value.infants > 0 && (
                <motion.div
                  className="passengers__row passengers__row--seats"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div>
                    <p className="passengers__row-label">Sillas para bebé</p>
                    <p className="passengers__row-hint">
                      Las llevamos sin costo. Máximo {value.infants}.
                    </p>
                  </div>
                  <div className="passengers__stepper">
                    <button
                      type="button"
                      onClick={() => step('babySeats', -1)}
                      disabled={value.babySeats <= 0}
                      aria-label="Menos sillas de bebé"
                    >
                      –
                    </button>
                    <strong aria-live="polite">{value.babySeats}</strong>
                    <button
                      type="button"
                      onClick={() => step('babySeats', 1)}
                      disabled={value.babySeats >= value.infants}
                      aria-label="Más sillas de bebé"
                    >
                      +
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="passengers__foot">
              {atMax ? (
                <p className="passengers__note passengers__note--warn">
                  {MAX_TOTAL} es lo máximo por vehículo. Para grupos mayores
                  coordinamos varias unidades: escríbenos.
                </p>
              ) : vehicle ? (
                <p className="passengers__note">
                  Para {total} {total === 1 ? 'pasajero' : 'pasajeros'} sugerimos{' '}
                  <strong>{vehicle.name}</strong> ({vehicle.model}).
                </p>
              ) : null}

              <button
                type="button"
                className="passengers__done"
                onClick={() => setOpen(false)}
              >
                Listo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
