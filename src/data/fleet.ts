// Flota real de Dominican Routes. Modelos, capacidades y el corte entre
// principales y resto vienen del propio cliente.
// Toda la flota se opera en blanco o negro.

export interface Vehicle {
  slug: string;
  name: string;
  /** Tipo de vehículo, sin marca: la web no compromete un modelo concreto. */
  type: string;
  minPax: number;
  maxPax: number;
  /** null = se cotiza según ruta y grupo. */
  price: number | null;
  /** Los cuatro que el cliente quiere ver destacados. */
  featured: boolean;
  /**
   * Elegible para la sugerencia automática por número de pasajeros. La limusina
   * y la miniván accesible se eligen a propósito, no por conteo de cabezas.
   */
  standard: boolean;
  /** Foto del cliente en public/images/fleet, o null si aún no llegó. */
  photo: string | null;
  summary: string;
  features: string[];
}

export const FLEET_NOTE = 'Toda la flota se opera en blanco o negro.';

export const FLEET: Vehicle[] = [
  {
    slug: 'sedan',
    name: 'Sedán',
    type: 'Automóvil ejecutivo',
    minPax: 1,
    maxPax: 2,
    price: 25,
    featured: true,
    standard: true,
    photo: '/images/fleet/sedan.webp',
    summary:
      'Para parejas o viajeros solos que quieren llegar rápido y sin compartir el auto con nadie.',
    features: ['Aire acondicionado', 'Asientos de cuero', 'Maletero para 2 maletas'],
  },
  {
    slug: 'minivan',
    name: 'Miniván',
    type: 'Van familiar',
    minPax: 1,
    maxPax: 6,
    price: 30,
    featured: true,
    standard: true,
    photo: '/images/fleet/minivan.webp',
    summary:
      'El punto dulce entre espacio y precio. Familias medianas con equipaje completo.',
    features: ['Asientos reclinables', 'Climatización potente', 'Equipaje sin apretar'],
  },
  {
    slug: 'minibus',
    name: 'Minibús',
    type: 'Van de grupo',
    minPax: 1,
    maxPax: 11,
    price: 50,
    featured: true,
    standard: true,
    photo: '/images/fleet/minibus.webp',
    summary:
      'Grupos que no quieren dividirse en dos vehículos ni pagar de más por ello.',
    features: ['Once plazas cómodas', 'Bodega para maletas', 'Conductor con experiencia'],
  },
  {
    slug: 'vip-luxury',
    name: 'VIP Luxury',
    type: 'SUV premium',
    minPax: 1,
    maxPax: 6,
    price: 60,
    featured: true,
    standard: true,
    photo: '/images/fleet/vip-luxury.webp',
    summary:
      'Traslado ejecutivo cuando la llegada también cuenta como parte del viaje.',
    features: ['Interior premium en cuero', 'Climatización dual', 'Conductor bilingüe'],
  },
  {
    slug: 'bus',
    name: 'Bus',
    type: 'Bus turístico',
    minPax: 1,
    maxPax: 22,
    price: null,
    featured: false,
    standard: true,
    photo: '/images/fleet/bus.webp',
    summary: 'Bodas, incentivos y grupos que se mueven juntos de principio a fin.',
    features: ['Hasta 22 pasajeros', 'Climatización central', 'Bodega de gran capacidad'],
  },
  {
    slug: 'autobus',
    name: 'Autobús',
    type: 'Autobús de gran capacidad',
    minPax: 1,
    maxPax: 50,
    price: null,
    featured: false,
    standard: true,
    photo: '/images/fleet/autobus.webp',
    summary: 'La opción para eventos corporativos y tours largos con el grupo completo.',
    features: ['Hasta 50 pasajeros', 'Asientos reclinables', 'Baño a bordo'],
  },
  {
    slug: 'limusina',
    name: 'Limusina',
    type: 'Vehículo para eventos',
    minPax: 1,
    maxPax: 6,
    price: 350,
    featured: false,
    standard: false,
    photo: '/images/fleet/limusina.webp',
    summary: 'Bodas, aniversarios y celebraciones donde la llegada es parte del evento.',
    features: ['Bar integrado', 'Iluminación LED y techo panorámico', 'Chofer uniformado'],
  },
  {
    slug: 'minivan-accesible',
    name: 'Miniván Accesible',
    type: 'Van adaptada',
    minPax: 1,
    maxPax: 4,
    price: 80,
    featured: false,
    standard: false,
    photo: '/images/fleet/minivan-accesible.webp',
    summary:
      'Adaptada para silla de ruedas, con conductor capacitado en asistencia. Hasta 4 pasajeros más la silla.',
    features: [
      'Rampa de acceso eléctrica',
      'Anclaje para silla de ruedas',
      'Espacio para equipaje médico',
    ],
  },
];

export const FEATURED_FLEET = FLEET.filter((v) => v.featured);
export const OTHER_FLEET = FLEET.filter((v) => !v.featured);
