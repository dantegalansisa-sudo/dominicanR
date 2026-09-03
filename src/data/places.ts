export interface PlaceGroup {
  label: string;
  items: string[];
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
