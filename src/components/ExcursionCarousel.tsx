import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Excursion } from '../data/excursions';
import { EASINGS } from '../utils/easings';
import { useT } from '../i18n';

/** Arrastre mínimo, en píxeles, para que cuente como pasar de foto. */
const SWIPE = 60;

/** Lo que se queda cada foto antes de pasar sola. */
const AUTOPLAY_MS = 5000;

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
 * Carrusel de la excursión elegida. Pasa solo cada cinco segundos, y también a
 * mano con las flechas, los puntos, el teclado o arrastrando.
 *
 * El automático se detiene mientras el visitante tiene el ratón encima, está
 * navegando con el teclado o arrastrando: vive pegado a los campos del
 * formulario, y una foto que salta bajo la mano interrumpe justo a quien está
 * a punto de reservar.
 */
export default function ExcursionCarousel({ item }: { item: Excursion }) {
  const [[index, dir], setSlide] = useState<[number, number]>([0, 0]);
  const [paused, setPaused] = useState(false);
  const total = item.photos.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const t = useT();

  // Cambiar de excursión tiene que devolvernos a su primera foto, o se
  // quedaría marcando la tercera de una galería que ya no existe.
  useEffect(() => setSlide([0, 0]), [item.slug]);

  // Depende de `index`, asi que al pasar de foto a mano el contador vuelve a
  // empezar y no salta a la siguiente medio segundo despues.
  useEffect(() => {
    if (total < 2 || paused) return;
    // Quien pide menos movimiento en su sistema no quiere carruseles solos.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(
      () => setSlide(([i]) => [(i + 1) % total, 1]),
      AUTOPLAY_MS,
    );
    return () => clearTimeout(t);
  }, [index, paused, total]);

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
      aria-roledescription={t.carousel.role}
      aria-label={t.carousel.photosOf(item.name)}
      tabIndex={single ? -1 : 0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
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
          alt={single ? item.name : t.carousel.photoN(item.name, index + 1, total)}
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
          onDragStart={() => setPaused(true)}
          onDragEnd={(_, info) => {
            setPaused(false);
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
            aria-label={t.carousel.prev}
          >
            <Chevron left />
          </button>
          <button
            type="button"
            className="carousel__nav carousel__nav--next"
            onClick={() => go(1)}
            aria-label={t.carousel.next}
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
                aria-label={t.carousel.goTo(i + 1)}
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
