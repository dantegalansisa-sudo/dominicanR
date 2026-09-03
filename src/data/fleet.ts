// Flota real de Dominican Routes. Modelos, capacidades y el corte entre
// principales y resto vienen del propio cliente.
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
  /** Los cuatro que el cliente quiere ver destacados. */
  featured: boolean;
  summary: string;
  features: string[];
}

export const FLEET_NOTE = 'Toda la flota se opera en blanco o negro.';

export const FLEET: Vehicle[] = [
  {
    slug: 'sedan',
    name: 'Sedán',
    model: 'Hyundai, Nissan o Toyota',
    minPax: 1,
    maxPax: 2,
    price: 25,
    featured: true,
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
    featured: true,
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
    featured: true,
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
    featured: true,
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
    featured: false,
    summary: 'Bodas, incentivos y grupos que se mueven juntos de principio a fin.',
    features: ['Hasta 22 pasajeros', 'Climatización central', 'Bodega de gran capacidad'],
  },
  {
    slug: 'autobus',
    name: 'Autobús',
    model: 'Autobús turístico',
    minPax: 1,
    maxPax: 50,
    price: null,
    featured: false,
    summary: 'La opción para eventos corporativos y tours largos con el grupo completo.',
    features: ['Hasta 50 pasajeros', 'Asientos reclinables', 'Baño a bordo'],
  },
  {
    slug: 'limusina',
    name: 'Limusina',
    model: 'Limusina de lujo',
    minPax: 1,
    maxPax: 6,
    price: 350,
    featured: false,
    summary: 'Bodas, aniversarios y celebraciones donde la llegada es parte del evento.',
    features: ['Bar integrado', 'Iluminación LED y techo panorámico', 'Chofer uniformado'],
  },
  {
    slug: 'minivan-accesible',
    name: 'Miniván Accesible',
    model: 'Miniván adaptada',
    minPax: 1,
    maxPax: 4,
    price: 80,
    featured: false,
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
