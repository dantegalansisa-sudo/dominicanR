/**
 * Tramos de edad según los definió el cliente. En excursiones el precio cambia
 * por tramo — el infante no paga — así que las etiquetas tienen que ser
 * exactas: es lo que después se cotiza.
 */
export const AGE_BANDS = {
  adults: { label: 'Adultos', hint: '11 años o más' },
  children: { label: 'Niños', hint: 'De 5 a 10 años' },
  infants: { label: 'Infantes', hint: 'De 0 a 4 años · no pagan' },
} as const;

/** En traslados el precio es por vehículo, así que solo importa la capacidad. */
export const TRANSFER_BANDS = {
  adults: { label: 'Adultos', hint: 'Ocupan una plaza' },
  children: { label: 'Niños', hint: 'Menores de 11 años' },
} as const;

export interface Party {
  adults: number;
  children: number;
  infants: number;
}

export const EMPTY_PARTY: Party = { adults: 2, children: 0, infants: 0 };

export const partyTotal = (p: Party) => p.adults + p.children + p.infants;

/** Solo cuentan para plazas los que ocupan asiento propio. */
export function partyLabel(p: Party, withInfants = true) {
  const bits = [`${p.adults} ${p.adults === 1 ? 'adulto' : 'adultos'}`];
  if (p.children) bits.push(`${p.children} ${p.children === 1 ? 'niño' : 'niños'}`);
  if (withInfants && p.infants)
    bits.push(`${p.infants} ${p.infants === 1 ? 'infante' : 'infantes'}`);
  return bits.join(', ');
}

/** Amenidades que el cliente ofrece en los traslados. */
export const AMENITIES = [
  { id: 'cerveza', label: 'Cervezas frías a bordo', unit: 'cervezas', unitOne: 'cerveza' },
  { id: 'agua', label: 'Agua embotellada', unit: 'botellas', unitOne: 'botella' },
  {
    id: 'silla',
    label: 'Silla para bebé',
    unit: 'sillas',
    unitOne: 'silla',
    note: 'Sin costo. Dinos cuántas y de qué edad.',
  },
  {
    id: 'paradas',
    label: 'Paradas adicionales',
    unit: 'paradas',
    unitOne: 'parada',
    note: 'Supermercado, farmacia, cajero… lo que necesites en el camino.',
  },
] as const;

/** "1 sillas" delata que el texto lo armó una máquina. */
export const amenityQty = (
  a: (typeof AMENITIES)[number],
  n: number,
) => `${n} ${n === 1 ? a.unitOne : a.unit}`;

export type AmenityId = (typeof AMENITIES)[number]['id'];
export type Amenities = Partial<Record<AmenityId, number>>;
