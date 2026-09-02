// Flota real de Dominican Routes. Los modelos y capacidades vienen del propio
// cliente; los precios base salen de su catálogo de traslados.
// Toda la flota se opera en blanco o negro.

export interface Vehicle {
  slug: string;
  name: string;
  /** Modelo concreto que opera el cliente. */
  model: string;
  minPax: number;
  maxPax: number;
  /** null = se cotiza según ruta y grupo. */
  price: number | null;
  summary: string;
  features: string[];
}

export const FLEET_NOTE = 'Toda la flota se opera en blanco o negro.';

export const FLEET: Vehicle[] = [
  {
    slug: 'carro',
    name: 'Carro',
    model: 'Hyundai, Nissan o Toyota sedán',
    minPax: 1,
    maxPax: 2,
    price: 25,
    summary:
      'Para parejas o viajeros solos que quieren llegar rápido y sin compartir el auto con nadie.',
    features: ['Aire acondicionado', 'Asientos de cuero', 'Maletero para 2 maletas'],
  },
  {
    slug: 'minivan',
    name: 'Miniván',
    model: 'Hyundai Grand Starex',
    minPax: 1,
    maxPax: 6,
    price: 30,
    summary:
      'El punto dulce entre espacio y precio. Familias medianas con equipaje completo.',
    features: ['Asientos reclinables', 'Climatización potente', 'Equipaje sin apretar'],
  },
  {
    slug: 'minibus',
    name: 'Minibús',
    model: 'Toyota Hiace',
    minPax: 1,
    maxPax: 11,
    price: 50,
    summary:
      'Grupos que no quieren dividirse en dos vehículos ni pagar de más por ello.',
    features: ['Once plazas cómodas', 'Bodega para maletas', 'Conductor con experiencia'],
  },
  {
    slug: 'vip-luxury',
    name: 'VIP Luxury',
    model: 'Chevrolet Suburban',
    minPax: 1,
    maxPax: 6,
    price: 60,
    summary:
      'Traslado ejecutivo cuando la llegada también cuenta como parte del viaje.',
    features: ['Interior premium en cuero', 'Climatización dual', 'Conductor bilingüe'],
  },
  {
    slug: 'bus',
    name: 'Bus',
    model: 'Toyota Coaster',
    minPax: 1,
    maxPax: 22,
    price: null,
    summary:
      'Bodas, incentivos y grupos que se mueven juntos de principio a fin.',
    features: ['Hasta 22 pasajeros', 'Climatización central', 'Bodega de gran capacidad'],
  },
  {
    slug: 'autobus',
    name: 'Autobús',
    model: 'Autobús turístico',
    minPax: 1,
    maxPax: 50,
    price: null,
    summary:
      'La opción para eventos corporativos y tours largos con el grupo completo.',
    features: ['Hasta 50 pasajeros', 'Asientos reclinables', 'Baño a bordo'],
  },
];
