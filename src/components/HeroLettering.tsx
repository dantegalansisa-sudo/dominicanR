import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { MotionStyle } from 'framer-motion';
import { EASINGS } from '../utils/easings';

/**
 * El letrero grande del hero: una provincia cada pocos segundos, y su vídeo
 * se ve a través de las letras.
 *
 * Cada entrada puede dibujarse de dos formas:
 *  - `mask`: una ilustración PNG (letras dibujadas a mano) que recorta el
 *    vídeo, como el "PUNTA CANA" original. Es la vía para los lettering por
 *    encargo: basta con añadir la ruta del PNG y el resto no cambia.
 *  - sin `mask`: la palabra se compone con la fuente (Anton) y se recorta el
 *    vídeo con un clipPath SVG del propio texto.
 */

export interface Province {
  id: string;
  /** Con acentos y en mayúsculas, tal como debe leerse. */
  word: string;
  /** Vídeos de escritorio y móvil, ya recortados a la proporción del letrero. */
  videoLg: string;
  videoSm: string;
  poster: string;
  /** PNG blanco sobre transparente con la palabra dibujada. Opcional. */
  mask?: string;
}

const V = (id: string) => ({
  videoLg: `/video/${id}-lg.mp4`,
  videoSm: `/video/${id}-sm.mp4`,
  poster: `/video/${id}-poster.jpg`,
});

export const PROVINCES: Province[] = [
  // Punta Cana conserva su lettering dibujado a mano (la máscara original).
  {
    id: 'punta-cana',
    word: 'PUNTA CANA',
    videoLg: '/video/punta-cana-lg.mp4',
    videoSm: '/video/punta-cana-sm.mp4',
    poster: '/images/punta-cana-poster.jpg',
    mask: '/images/punta-cana-mask.png',
  },
  { id: 'higuey', word: 'HIGÜEY', ...V('higuey') },
  { id: 'la-romana', word: 'LA ROMANA', ...V('la-romana') },
  { id: 'pedernales', word: 'PEDERNALES', ...V('pedernales') },
  { id: 'puerto-plata', word: 'PUERTO PLATA', ...V('puerto-plata') },
  { id: 'samana', word: 'SAMANÁ', ...V('samana') },
  { id: 'santo-domingo', word: 'SANTO DOMINGO', ...V('santo-domingo') },
];

/** Lo que se queda cada provincia antes de dar paso a la siguiente. */
const HOLD_MS = 4000;

/** La fuente con la que se componen las palabras sin máscara. */
const FONT = '"Anton", "Impact", "Arial Narrow", sans-serif';

/** Cómo se compone una palabra: tamaño de letra y cada línea con su base. */
interface Fit {
  size: number;
  lines: { text: string; baseline: number }[];
  /** Ancho al que se comprime la línea (solo con una línea), o null. */
  textLength: number | null;
}

/**
 * Las letras no pasan de la altura del lettering de Punta Cana, que ocupa
 * unos dos tercios de la caja: así las cortas (HIGÜEY, SAMANÁ) no salen más
 * grandes que él y todas se mueven en la misma escala.
 */
const MAX_CAP = 0.68;

/**
 * Las largas se estrechan un poco para acercarse a esa altura: hasta un 20%
 * (Anton ya es condensada y más se notaría). SANTO DOMINGO sigue sin llegar,
 * pero gana bastante respecto a dejarla al ancho natural.
 */
const CONDENSE_MAX = 0.8;

/** Separación entre dos líneas, como fracción de la altura de mayúsculas. */
const LINE_GAP = 0.14;

/**
 * Tamaño de letra que hace caber la palabra en la caja, midiendo con canvas.
 * Todas van en una sola línea, también SANTO DOMINGO y PUERTO PLATA aunque
 * salgan algo más pequeñas: el cliente prefiere la lectura de una línea.
 * Queda el reparto en dos por si se quiere recuperar (`TWO_LINES`).
 */
const TWO_LINES = false;

function fitFont(word: string, w: number, h: number, ready: boolean): Fit {
  if (!w || !h) return { size: 0, lines: [], textLength: null };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { size: h * 0.9, lines: [{ text: word, baseline: h * 0.9 }], textLength: null };
  // Se mide a 100px y se escala: la relación ancho/alto de la fuente es fija.
  ctx.font = `100px ${ready ? FONT : 'Impact, sans-serif'}`;
  // La altura de referencia es la de las mayúsculas sin acento: HIGÜEY y
  // SAMANÁ no deben salir más pequeñas por llevar diéresis o tilde. Lo que
  // sobresalga por arriba solo se comprueba contra el techo de la caja.
  const capH = ctx.measureText('H').actualBoundingBoxAscent || 72;
  const ascent = ctx.measureText(word).actualBoundingBoxAscent || capH;
  const widthOf = (t: string) => ctx.measureText(t).width || 1;

  const layout = (lines: string[]): Fit => {
    const n = lines.length;
    // Un 2% de aire a los lados para que el trazo de los extremos no se corte.
    const maxW = w * 0.98;
    const byWidth = Math.min(...lines.map((l) => maxW / widthOf(l)));
    const blockH = capH * (n + LINE_GAP * (n - 1));
    const byHeight = Math.min(
      (h * 0.96) / (blockH + (ascent - capH)),
      (h * MAX_CAP) / capH,
    );
    // A una línea se permite comprimir hasta CONDENSE_MAX; a dos, no.
    const scale = n === 1 ? Math.min(byWidth / CONDENSE_MAX, byHeight) : Math.min(byWidth, byHeight);
    const natural = widthOf(lines[0]!) * scale;
    const textLength = n === 1 && natural > maxW ? maxW : null;
    // Centrado en vertical: la misma holgura arriba y abajo del bloque.
    const top = (h - blockH * scale) / 2;
    return {
      size: 100 * scale,
      lines: lines.map((text, i) => ({
        text,
        baseline: top + capH * scale * (1 + i * (1 + LINE_GAP)),
      })),
      textLength,
    };
  };

  const single = layout([word]);
  const parts = word.split(' ');
  if (!TWO_LINES || parts.length < 2) return single;
  const twoLines = layout(parts);
  return twoLines.size > single.size ? twoLines : single;
}

function Slide({
  p,
  w,
  h,
  fontReady,
  playing,
  reduced,
}: {
  p: Province;
  w: number;
  h: number;
  fontReady: boolean;
  playing: boolean;
  reduced: boolean;
}) {
  const clipId = useId().replace(/:/g, '');
  const fit = p.mask ? null : fitFont(p.word, w, h, fontReady);

  return (
    <motion.div
      className="hero__slide"
      initial={reduced ? false : { clipPath: 'inset(0 100% 0 0)', opacity: 1 }}
      animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.55, ease: EASINGS.smooth } }}
      transition={{ duration: 0.95, ease: EASINGS.premium }}
    >
      {!p.mask && fit && w > 0 && (
        <svg className="hero__clip-defs" aria-hidden="true">
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              {/* En unidades de la caja (0..1): se compone en píxeles y se
                  escala, que es más fácil que pensar en fracciones. */}
              <text
                transform={`scale(${1 / w} ${1 / h})`}
                fontFamily={FONT}
                fontSize={fit.size}
                fontWeight={400}
                letterSpacing={fit.size * 0.01}
                {...(fit.textLength
                  ? { x: w * 0.01, y: fit.lines[0]!.baseline, textLength: fit.textLength, lengthAdjust: 'spacingAndGlyphs' as const }
                  : {})}
              >
                {fit.textLength
                  ? fit.lines[0]!.text
                  : fit.lines.map((l) => (
                      <tspan key={l.text} x={w * 0.01} y={l.baseline}>
                        {l.text}
                      </tspan>
                    ))}
              </text>
            </clipPath>
          </defs>
        </svg>
      )}

      <div
        className={`hero__slide-media${p.mask ? ' hero__slide-media--mask' : ''}`}
        style={
          p.mask
            ? { maskImage: `url(${p.mask})`, WebkitMaskImage: `url(${p.mask})` }
            : { clipPath: `url(#${clipId})` }
        }
      >
        <video
          key={p.id}
          autoPlay={playing && !reduced}
          muted
          loop
          playsInline
          preload="auto"
          poster={p.poster}
        >
          <source src={p.videoSm} type="video/mp4" media="(max-width: 760px)" />
          <source src={p.videoLg} type="video/mp4" />
        </video>
      </div>

      {/* Texto de verdad para lectores de pantalla y buscadores. */}
      <span className="sr-only">{p.word}</span>
    </motion.div>
  );
}

export default function HeroLettering({ style }: { style?: MotionStyle }) {
  const reduced = useReducedMotion() ?? false;
  const boxRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [fontReady, setFontReady] = useState(false);
  const [index, setIndex] = useState(0);

  // El tamaño de la caja manda en el tamaño de letra; se sigue en vivo.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Hasta que Anton no está cargada, canvas mediría con la fuente de reserva
  // y la palabra saldría con otro ancho. Se espera y se vuelve a medir.
  useEffect(() => {
    let alive = true;
    document.fonts
      .load(`100px ${FONT}`)
      .then(() => alive && setFontReady(true))
      .catch(() => alive && setFontReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // El ciclo. Con "reducir movimiento" no hay ciclo: se queda en la primera.
  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % PROVINCES.length), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [index, reduced]);

  const current = PROVINCES[index]!;
  const next = PROVINCES[(index + 1) % PROVINCES.length]!;

  return (
    <motion.span ref={boxRef} className="hero__lettering" style={style} aria-live="off">
      <AnimatePresence mode="sync" initial={false}>
        <Slide
          key={current.id}
          p={current}
          w={size.w}
          h={size.h}
          fontReady={fontReady}
          playing
          reduced={reduced}
        />
      </AnimatePresence>

      {/* El siguiente vídeo se descarga en silencio para que al cambiar ya
          esté listo: mismo archivo, así que el navegador lo saca de la caché. */}
      {!reduced && (
        <video
          key={`pre-${next.id}`}
          className="hero__preload"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src={next.videoSm} type="video/mp4" media="(max-width: 760px)" />
          <source src={next.videoLg} type="video/mp4" />
        </video>
      )}
    </motion.span>
  );
}
