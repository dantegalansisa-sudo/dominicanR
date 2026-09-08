import ImagePlaceholder from './ImagePlaceholder';
import type { Excursion } from '../data/excursions';

/**
 * La foto real de la excursion, con el marcador dibujado como respaldo. Sigue
 * haciendo falta el respaldo: si el cliente anade una excursion nueva antes de
 * mandar su foto, la tarjeta se ve terminada en lugar de rota.
 */
export default function ExcursionPhoto({
  item,
  /**
   * Las seis de la portada se cargan de inmediato porque estan a la vista; las
   * 38 del catalogo, solo al acercarse, para no bajar dos megas de golpe.
   */
  eager = false,
}: {
  item: Excursion;
  eager?: boolean;
}) {
  const cover = item.photos[0];
  if (!cover) return <ImagePlaceholder category={item.category} />;

  return (
    <img
      className="exc-photo"
      src={cover}
      alt={item.name}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
