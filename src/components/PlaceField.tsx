import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlaceGroup, PlaceValue } from '../data/places';
import { fetchPlace, fetchSuggestions, newSessionToken } from '../utils/googlePlaces';
import type { Suggestion } from '../utils/googlePlaces';

/** Ignore accents and case so "bavaro" finds "Bávaro". */
const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Debajo de esto no se consulta a Google: es ruido y se paga igual. */
const MIN_QUERY = 3;

/** Deja de escribir y entonces preguntamos, en vez de una llamada por tecla. */
const DEBOUNCE_MS = 280;

/** Un ítem navegable con el teclado, venga de la lista fija o de Google. */
type Entry =
  | { kind: 'static'; text: string }
  | { kind: 'google'; s: Suggestion };

interface PlaceFieldProps {
  id: string;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  groups: PlaceGroup[];
  value: PlaceValue;
  onChange: (p: PlaceValue) => void;
  /**
   * Consultar Google además de la lista fija. Se apaga en el selector de
   * excursiones, que es un catálogo cerrado nuestro y no un lugar del mapa.
   */
  google?: boolean;
}

/**
 * Combobox sobre aeropuertos y zonas, ampliado con lugares reales de Google
 * restringidos a República Dominicana. Nunca es una restricción dura: lo que el
 * visitante escriba vale por sí solo, porque muchas recogidas son una casa o
 * una dirección que Google no tiene indexada.
 */
export default function PlaceField({
  id,
  label,
  placeholder,
  icon,
  groups,
  value,
  onChange,
  google = false,
}: PlaceFieldProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [remote, setRemote] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // El token agrupa las teclas de una búsqueda en una sola sesión facturable.
  // Se renueva al elegir un resultado, que es lo que cierra la sesión.
  const session = useRef(newSessionToken());

  const query = value.text.trim();

  const filtered = useMemo(() => {
    const q = fold(query);
    return groups
      .map((g) => ({
        label: g.label,
        items: q ? g.items.filter((i) => fold(i).includes(q)) : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  useEffect(() => {
    if (!google || !open) return;
    if (query.length < MIN_QUERY) {
      setRemote([]);
      setLoading(false);
      return;
    }
    // Si el visitante ya eligió un lugar, el texto coincide con él y volver a
    // preguntar solo gastaría una llamada para devolver lo mismo.
    if (value.placeId) return;

    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetchSuggestions(query, session.current, ctrl.signal)
        .then(setRemote)
        .catch(() => setRemote([]))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [google, open, query, value.placeId]);

  // Los de Google van después: la lista fija son los sitios que más se piden y
  // conviene poder tocarlos sin leer nada más.
  const flat = useMemo<Entry[]>(
    () => [
      ...filtered.flatMap((g) => g.items.map((text): Entry => ({ kind: 'static', text }))),
      ...remote.map((s): Entry => ({ kind: 'google', s })),
    ],
    [filtered, remote],
  );

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setCursor(-1);
  };

  const pickStatic = (text: string) => {
    onChange({ text });
    close();
  };

  const pickGoogle = (s: Suggestion) => {
    const text = s.main;
    // Se pinta el texto ya, sin esperar a la red: el campo nunca se queda vacío
    // mientras llegan las coordenadas.
    onChange({ text, placeId: s.placeId });
    close();
    setRemote([]);
    const token = session.current;
    session.current = newSessionToken();
    fetchPlace(s.placeId, token, text).then(onChange);
  };

  const pick = (e: Entry) =>
    e.kind === 'static' ? pickStatic(e.text) : pickGoogle(e.s);

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

  const showMenu = open && (flat.length > 0 || loading);

  return (
    <div className="search__field place" ref={wrapRef}>
      <label className="search__label" htmlFor={id}>
        {icon}
        {label}
      </label>
      <input
        id={id}
        value={value.text}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          // Al reescribir, el lugar elegido deja de corresponder al texto.
          onChange({ text: e.target.value });
          setOpen(true);
          setCursor(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      <AnimatePresence>
        {showMenu && (
          <motion.div
            key="place-menu"
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
                  const idx = flat.findIndex(
                    (e) => e.kind === 'static' && e.text === item,
                  );
                  return (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={value.text === item}
                      className={`place__option${idx === cursor ? ' is-cursor' : ''}`}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => pickStatic(item)}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            ))}

            {google && (loading || remote.length > 0) && (
              <div className="place__group place__group--google">
                <p className="place__group-label">
                  Direcciones y hoteles
                  {loading && <span className="place__spinner" aria-hidden="true" />}
                </p>

                {remote.map((s) => {
                  const idx = flat.findIndex(
                    (e) => e.kind === 'google' && e.s.placeId === s.placeId,
                  );
                  return (
                    <button
                      key={s.placeId}
                      type="button"
                      role="option"
                      aria-selected={value.placeId === s.placeId}
                      className={`place__option place__option--rich${
                        idx === cursor ? ' is-cursor' : ''
                      }`}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => pickGoogle(s)}
                    >
                      <span className="place__main">{s.main}</span>
                      {s.secondary && (
                        <span className="place__secondary">{s.secondary}</span>
                      )}
                    </button>
                  );
                })}

                {/* Google exige la atribución cuando sus resultados se muestran
                    fuera de un mapa suyo. */}
                <p className="place__attrib">Powered by Google</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
