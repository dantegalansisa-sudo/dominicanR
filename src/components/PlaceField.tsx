import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlaceGroup } from '../data/places';

/** Ignore accents and case so "bavaro" finds "Bávaro". */
const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface PlaceFieldProps {
  id: string;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  groups: PlaceGroup[];
  value: string;
  onChange: (v: string) => void;
}

/**
 * Combobox over the airports and zones, but never a hard constraint: whatever
 * the visitor types stands on its own, because plenty of pickups are a specific
 * hotel or address we cannot list.
 */
export default function PlaceField({
  id,
  label,
  placeholder,
  icon,
  groups,
  value,
  onChange,
}: PlaceFieldProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = fold(value.trim());
    return groups
      .map((g) => ({
        label: g.label,
        items: q ? g.items.filter((i) => fold(i).includes(q)) : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, value]);

  // Flat list keeps arrow-key navigation simple across group headings.
  const flat = useMemo(() => filtered.flatMap((g) => g.items), [filtered]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setCursor(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setCursor((c) => {
        const next = c + dir;
        if (next < 0) return flat.length - 1;
        if (next >= flat.length) return 0;
        return next;
      });
      return;
    }
    if (e.key === 'Enter' && open && cursor >= 0 && flat[cursor]) {
      e.preventDefault();
      pick(flat[cursor]);
    }
  };

  return (
    <div className="search__field place" ref={wrapRef}>
      <label className="search__label" htmlFor={id}>
        {icon}
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setCursor(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.div
            className="place__menu"
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {filtered.map((g) => (
              <div key={g.label} className="place__group">
                <p className="place__group-label">{g.label}</p>
                {g.items.map((item) => {
                  const idx = flat.indexOf(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={value === item}
                      className={`place__option${idx === cursor ? ' is-cursor' : ''}`}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => pick(item)}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
