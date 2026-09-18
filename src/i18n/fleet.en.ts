/** Fleet copy in English, keyed by slug. Names stay as the client sells them. */
export const FLEET_EN: Record<string, { name?: string; type: string; summary: string; features: string[] }> = {
  sedan: {
    name: 'Sedan',
    type: 'Standard car',
    summary: 'For couples or solo travelers who want to get there fast without sharing the car with anyone.',
    features: ['Air conditioning', 'Leather seats', 'Trunk for 2 suitcases'],
  },
  minivan: {
    name: 'Minivan',
    type: 'Family van',
    summary: 'The sweet spot between space and price. Mid-sized families with all their luggage.',
    features: ['Reclining seats', 'Powerful climate control', 'Luggage without squeezing'],
  },
  minibus: {
    name: 'Minibus',
    type: 'Group van',
    summary: 'Groups that do not want to split into two vehicles or pay extra for it.',
    features: ['Eleven comfortable seats', 'Luggage hold', 'Experienced driver'],
  },
  'vip-luxury': {
    type: 'Premium SUV',
    summary: 'An executive transfer for when the arrival is part of the trip too.',
    features: ['Premium leather interior', 'Dual climate control', 'Bilingual driver'],
  },
  bus: {
    type: 'Tourist bus',
    summary: 'Weddings, incentive trips and groups that move together from start to finish.',
    features: ['Up to 22 passengers', 'Central air conditioning', 'Large luggage hold'],
  },
  autobus: {
    name: 'Coach',
    type: 'High-capacity coach',
    summary: 'The choice for corporate events and long tours with the whole group.',
    features: ['Up to 50 passengers', 'Reclining seats', 'Restroom on board'],
  },
  limusina: {
    name: 'Limousine',
    type: 'Event vehicle',
    summary: 'Weddings, anniversaries and celebrations where the arrival is part of the event.',
    features: ['Built-in bar', 'LED lighting and panoramic roof', 'Uniformed chauffeur'],
  },
  'minivan-accesible': {
    name: 'Accessible Minivan',
    type: 'Adapted van',
    summary: 'Wheelchair-adapted, with a driver trained in assistance. Up to 4 passengers plus the chair.',
    features: ['Electric access ramp', 'Wheelchair anchoring', 'Room for medical luggage'],
  },
};
