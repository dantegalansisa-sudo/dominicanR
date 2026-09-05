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

/**
 * Adicionales del traslado, con el precio que fijó el cliente. Todos en USD y
 * por unidad, salvo las paradas, que se cobran por bloque de tiempo.
 */
export const SEATS = [
  { id: 'baby', label: 'Baby seat', price: 5 },
  { id: 'car', label: 'Car seat', price: 5 },
  { id: 'booster', label: 'Booster seat', price: 5 },
] as const;

export const DRINKS = [
  { id: 'cerveza', label: 'Cervezas frías', price: 5, unit: 'cervezas', unitOne: 'cerveza' },
  { id: 'agua', label: 'Agua embotellada', price: 1, unit: 'botellas', unitOne: 'botella' },
] as const;

/** El precio por minuto baja con el bloque, así que conviene decirlo. */
export const STOPS = [
  { id: '15', label: '15 minutos', minutes: 15, price: 15 },
  { id: '30', label: '30 minutos', minutes: 30, price: 25 },
  { id: '60', label: '1 hora', minutes: 60, price: 35 },
] as const;

export type SeatId = (typeof SEATS)[number]['id'];
export type DrinkId = (typeof DRINKS)[number]['id'];
export type StopId = (typeof STOPS)[number]['id'];

export interface Extras {
  seats: Record<SeatId, number>;
  drinks: Record<DrinkId, number>;
  stop: StopId | null;
}

export const EMPTY_EXTRAS: Extras = {
  seats: { baby: 0, car: 0, booster: 0 },
  drinks: { cerveza: 0, agua: 0 },
  stop: null,
};

export function extrasTotal(e: Extras) {
  const seats = SEATS.reduce((sum, s) => sum + s.price * e.seats[s.id], 0);
  const drinks = DRINKS.reduce((sum, d) => sum + d.price * e.drinks[d.id], 0);
  const stop = STOPS.find((s) => s.id === e.stop)?.price ?? 0;
  return seats + drinks + stop;
}

/** Líneas legibles para el correo y para el resumen lateral. */
export function extrasLines(e: Extras) {
  const out: string[] = [];
  for (const s of SEATS) {
    if (e.seats[s.id] > 0)
      out.push(`${s.label} x${e.seats[s.id]} — $${s.price * e.seats[s.id]}`);
  }
  for (const d of DRINKS) {
    if (e.drinks[d.id] > 0)
      out.push(`${d.label} x${e.drinks[d.id]} — $${d.price * e.drinks[d.id]}`);
  }
  const stop = STOPS.find((s) => s.id === e.stop);
  if (stop) out.push(`Paradas adicionales, ${stop.label} — $${stop.price}`);
  return out;
}

