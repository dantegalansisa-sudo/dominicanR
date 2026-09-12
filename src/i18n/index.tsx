import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { es } from './es';
import { en } from './en';

/**
 * Idioma de la web. Dos diccionarios con la misma forma: `en` esta tipado
 * como `typeof es`, asi que una clave que falte en ingles no compila. Sin
 * libreria: son dos idiomas y unas decenas de textos, no hace falta mas.
 */

export type Lang = 'es' | 'en';
export type Dict = typeof es;

const DICTS: Record<Lang, Dict> = { es, en };
const STORAGE_KEY = 'dr-lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // Navegacion privada o almacenamiento bloqueado: se decide por el navegador.
  }
  // El publico es en buena parte extranjero: si el navegador viene en ingles,
  // se arranca en ingles y el visitante cambia si quiere.
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')
    ? 'en'
    : 'es';
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Sin almacenamiento el cambio vale para esta visita y ya.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: DICTS[lang] }), [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang() fuera de <LangProvider>');
  return ctx;
}

/** Atajo para componentes que solo leen textos. */
export const useT = () => useLang().t;
