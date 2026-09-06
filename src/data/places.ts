export interface PlaceGroup {
  label: string;
  items: string[];
}

/**
 * Un lugar tal y como lo maneja el formulario. `text` es lo que ve y escribe el
 * visitante; el resto solo aparece cuando eligió un resultado de Google, y es
 * lo que convierte "Hotel Riu, calle X" en un punto al que el conductor puede
 * llegar. Escribir libremente sigue siendo válido: entonces solo hay texto.
 */
export interface PlaceValue {
  text: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export const emptyPlace = (text = ''): PlaceValue => ({ text });

/** Enlace que abre el punto exacto en Google Maps, para el correo al operador. */
export function placeMapsUrl(p: PlaceValue): string | null {
  if (p.placeId) {
    return (
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(p.address || p.text) +
      '&query_place_id=' +
      p.placeId
    );
  }
  if (typeof p.lat === 'number' && typeof p.lng === 'number') {
    return 'https://www.google.com/maps/search/?api=1&query=' + p.lat + ',' + p.lng;
  }
  return null;
}

/** Aeropuertos internacionales de República Dominicana, por volumen turístico. */
export const AIRPORTS = [
  'Aeropuerto de Punta Cana (PUJ)',
  'Aeropuerto Las Américas, Santo Domingo (SDQ)',
  'Aeropuerto La Isabela, Santo Domingo (JBQ)',
  'Aeropuerto de La Romana (LRM)',
  'Aeropuerto Gregorio Luperón, Puerto Plata (POP)',
  'Aeropuerto del Cibao, Santiago (STI)',
  'Aeropuerto El Catey, Samaná (AZS)',
];

/** Zonas hoteleras y ciudades a las que más traslados se piden. */
export const ZONES = [
  'Bávaro',
  'Punta Cana',
  'Cap Cana',
  'Uvero Alto',
  'Macao',
  'Bayahíbe',
  'La Romana',
  'Santo Domingo',
  'Juan Dolio',
  'Boca Chica',
  'Las Terrenas',
  'Samaná',
  'Puerto Plata',
  'Sosúa',
  'Cabarete',
  'Jarabacoa',
];

export const TRANSFER_PLACES: PlaceGroup[] = [
  { label: 'Aeropuertos', items: AIRPORTS },
  { label: 'Zonas y ciudades', items: ZONES },
];

/** Puntos de recogida típicos para excursiones: siempre hotel o zona. */
export const PICKUP_PLACES: PlaceGroup[] = [
  { label: 'Zonas hoteleras', items: ZONES },
  { label: 'Aeropuertos', items: AIRPORTS },
];
