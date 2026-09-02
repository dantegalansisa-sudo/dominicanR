import type { CategoryId } from '../data/excursions';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** One line mark per category, so the placeholders never all look alike. */
const MARKS: Record<string, React.ReactNode> = {
  islas: (
    <>
      <path d="M12 4v12" {...stroke} />
      <path d="M12 4c-3 0-5.4 1.6-6.4 3.4C7.4 6.6 10 7 12 8.4 14 7 16.6 6.6 18.4 7.4 17.4 5.6 15 4 12 4Z" {...stroke} />
      <path d="M2 19.2c1.6-1.4 3.4-1.4 5 0 1.6 1.4 3.4 1.4 5 0 1.6-1.4 3.4-1.4 5 0 1.6 1.4 3.4 1.4 5 0" {...stroke} />
    </>
  ),
  aventura: (
    <>
      <path d="M3 18 9.5 6.5 14 14l2.4-4.2L21 18Z" {...stroke} />
      <circle cx="17.4" cy="5.6" r="2" {...stroke} />
    </>
  ),
  acuaticas: (
    <>
      <path d="M3 16.5c1.6-1.3 3.4-1.3 5 0 1.6 1.3 3.4 1.3 5 0 1.6-1.3 3.4-1.3 5 0 .8.6 1.6.9 2.4.9" {...stroke} />
      <path d="M5.5 12.5 12 4l6.5 8.5" {...stroke} />
      <path d="M12 4v8.5" {...stroke} />
    </>
  ),
  naturaleza: (
    <>
      <path d="M12 20v-6" {...stroke} />
      <path d="M12 14c0-3.6 2.6-6.6 6-7-.4 3.9-2.8 6.6-6 7Z" {...stroke} />
      <path d="M12 16c-3.2-.4-5.6-3.1-6-7 3.4.4 6 3.4 6 7Z" {...stroke} />
    </>
  ),
  cultura: (
    <>
      <path d="M4 20h16M6 20V10l6-4 6 4v10" {...stroke} />
      <path d="M10 20v-5h4v5" {...stroke} />
    </>
  ),
  nocturna: (
    <>
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" {...stroke} />
      <path d="M16 4.5 16.7 6l1.5.7-1.5.7-.7 1.5-.7-1.5L13.8 6l1.5-.7Z" {...stroke} />
    </>
  ),
  vip: (
    <>
      <path d="m12 3.5 2.5 5.2 5.5.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.5-.8Z" {...stroke} />
    </>
  ),
};

interface ImagePlaceholderProps {
  category: CategoryId;
  /** Shown under the mark; keep it short. */
  label?: string;
}

/**
 * Stands in until the client sends the excursion photography. Deliberately
 * designed rather than left as an empty grey box, so the demo reads as
 * finished instead of broken.
 */
export default function ImagePlaceholder({
  category,
  label = 'Imagen próximamente',
}: ImagePlaceholderProps) {
  return (
    <div className="ph" role="img" aria-label={label}>
      <div className="ph__weave" aria-hidden="true" />
      <div className="ph__body">
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
          {MARKS[category] ?? MARKS.islas}
        </svg>
        <span className="ph__label">{label}</span>
      </div>
    </div>
  );
}
