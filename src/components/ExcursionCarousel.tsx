import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Excursion } from '../data/excursions';
import { EASINGS } from '../utils/easings';

/** Arrastre mínimo, en píxeles, para que cuente como pasar de foto. */
const SWIPE = 60;

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%' }),
  center: { x: 0 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%' }),
};

const Chevron = ({ left = false }: { left?: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={left ? { transform: 'rotate(180deg)' } : undefined}
    aria-hidden="true"
  >
    <path d="m9 5 7 7-7 7" />
  </svg>
);

/**
 * Carrusel de la excursión elegida. No avanza solo a propósito: vive junto a
 * los campos que el visitante está rellenando, y una imagen que se mueve sola
 * al lado de un formulario distrae en lugar de ayudar. Se pasa con las flechas,
 * los puntos, el teclado o arrastrando.
 */
export default function ExcursionCarousel({ item }: { item: Excursion }) {
  const [[index, dir], setSlide] = useState<[number, number]>([0, 0]);
  const total = item.photos.length;
  const wrapRef = useRef<HTMLDivElement>(null);

  // Cambiar de excursión tiene que devolvernos a su primera foto, o se
  // quedaría marcando la tercera de una galería que ya no existe.
  useEffect(() => setSlide([0, 0]), [item.slug]);

  if (total === 0) return null;

  const go = (delta: number) =>
    setSlide(([i]) => [(i + delta + total) % total, delta]);

  const jump = (to: number) => setSlide(([i]) => [to, to > i ? 1 : -1]);

  const single = total === 1;

  return (
    <div
      className="carousel"
      ref={wrapRef}
      role="group"
      aria-roledescription="carrusel"
      aria-label={`Fotos de ${item.name}`}
      tabIndex={single ? -1 : 0}
      onKeyDown={(e) => {
        if (single) return;
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          go(1);
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          go(-1);
        }
      }}
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.img
          key={item.photos[index]}
          className="carousel__img"
          src={item.photos[index]}
          alt={
            single
              ? item.name
              : `${item.name}, foto ${index + 1} de ${total}`
          }
          decoding="async"
          draggable={false}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.45, ease: EASINGS.premium }}
          drag={single ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          onDragEnd={(_, info) => {
            if (info.offset.x < -SWIPE) go(1);
            else if (info.offset.x > SWIPE) go(-1);
          }}
        />
      </AnimatePresence>

      {!single && (
        <>
          <button
            type="button"
            className="carousel__nav carousel__nav--prev"
            onClick={() => go(-1)}
            aria-label="Foto anterior"
          >
            <Chevron left />
          </button>
          <button
            type="button"
            className="carousel__nav carousel__nav--next"
            onClick={() => go(1)}
            aria-label="Foto siguiente"
          >
            <Chevron />
          </button>

          <div className="carousel__dots">
            {item.photos.map((src, i) => (
              <button
                key={src}
                type="button"
                className={`carousel__dot${i === index ? ' is-on' : ''}`}
                onClick={() => jump(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </>
      )}

      {/* Las siguientes se descargan calladas para que el salto sea inmediato. */}
      <div className="carousel__preload" aria-hidden="true">
        {item.photos.slice(1).map((src) => (
          <img key={src} src={src} alt="" loading="lazy" decoding="async" />
        ))}
      </div>
    </div>
  );
}
