import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------- avisos */

interface Toast {
  text: string;
  bad?: boolean;
}

const ToastContext = createContext<(text: string, bad?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), bad ? 5000 : 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className={`adm-toast${toast.bad ? ' adm-toast--bad' : ''}`} role="status">
          {toast.text}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* -------------------------------------------------------------- campos */

export function Field({
  label,
  hint,
  full = false,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`adm-field${full ? ' adm-field--full' : ''}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="adm-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Lista de líneas: una por renglón en el textarea, sin renglones vacíos. */
export function LinesField({
  label,
  value,
  onChange,
  hint = 'Una por línea.',
  rows = 5,
  full = true,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  hint?: string;
  rows?: number;
  full?: boolean;
}) {
  // Se edita como texto y se convierte al salir: si se convirtiera en cada
  // tecla, no se podría escribir una línea vacía a medio camino.
  const [text, setText] = useState(value.join('\n'));
  useEffect(() => setText(value.join('\n')), [value]);
  return (
    <Field label={label} hint={hint} full={full}>
      <textarea
        rows={rows}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() =>
          onChange(
            text
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean),
          )
        }
      />
    </Field>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string }[];
}) {
  return (
    <div className="adm-tabs" role="tablist">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          className={value === it.id ? 'is-active' : ''}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Botón que sube una imagen y avisa cuando termina. */
export function UploadButton({
  label,
  onFile,
  busy = false,
  multiple = false,
}: {
  label: string;
  onFile: (files: File[]) => void;
  busy?: boolean;
  multiple?: boolean;
}) {
  return (
    <label className="adm-upload">
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={busy}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFile(files);
        }}
      />
      {busy ? 'Subiendo…' : label}
    </label>
  );
}

/** Número o vacío (null), para precios que pueden ser "a cotizar". */
export const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
