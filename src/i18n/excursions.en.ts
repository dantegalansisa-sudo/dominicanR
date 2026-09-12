/**
 * Excursion copy in English, keyed by slug. Anything not listed here (name,
 * a ticket name…) falls back to the Spanish catalogue, which is fine for
 * proper nouns like "Scape Park" or "Coco Bongo".
 */
export interface ExcursionEn {
  name?: string;
  duration: string;
  description: string;
  includes: string[];
  activities: string[];
  /** Same order as the Spanish tickets; `name` optional when it is already English. */
  tickets?: { name?: string; includes: string }[];
}

export const EXCURSIONS_EN: Record<string, ExcursionEn> = {
  'isla-saona-clasica': {
    name: 'Saona Island Classic',
    duration: '8 hours',
    description: 'A tropical paradise of white-sand beaches and crystal-clear turquoise water.',
    includes: ['Round-trip transportation', 'Dominican buffet lunch', 'Bilingual tour guide', 'Staff assistance', 'Stop at the natural pool', 'Unlimited drinks (rum, soft drinks, water)'],
    activities: ['Catamaran sailing', 'Beach games', 'Free time on the beach', 'Dancing and music on board', 'Visit to the starfish natural pool'],
  },
  'scape-park': {
    duration: '6 hours',
    description: 'Swim in crystal-clear cenotes, zip-line over the jungle and explore natural caves in this eco park.',
    includes: ['Round-trip transportation', 'Cenote access', 'Zip lines', 'Cave exploration', 'Safety equipment', 'Expert guides'],
    activities: ['Swimming in crystal-clear cenotes', 'Zip lines over the jungle', 'Cave exploration', 'Cliff jumping (optional)', 'Natural eco-adventure'],
  },
  'montana-redonda-playa-esmeralda': {
    name: 'Montaña Redonda & Playa Esmeralda',
    duration: '5 or 6 hours',
    description: '360° panoramic views from the mountain, photogenic swings and a beach afternoon.',
    includes: ['Round-trip transportation', '4x4 transportation', 'Snacks', 'Lunch (optional extra)', 'Entrance to Montaña Redonda', 'Time at Playa Esmeralda'],
    activities: ['360° panoramic views', 'Photos on the swings', 'Playa Costa Esmeralda or Playa Macao', 'Relaxing on the beach'],
  },
  'parasailing-aventuras-aire': {
    name: 'Parasailing - Adventures in the Air',
    duration: '2 hours',
    description: 'Fly over the Caribbean Sea by parachute and take in spectacular panoramic views.',
    includes: ['Round-trip transportation', '12 to 15 minute flight', 'Certified safety equipment', 'Harness and life jacket', 'Professional instructor', 'Photos from the boat'],
    activities: ['Parachute flight over the sea', 'Boat take-off and landing', 'Panoramic views of the coast', 'Adrenaline experience', 'Photo session (extra)'],
  },
  'buggy-adventure': {
    duration: '4 hours',
    description: 'Drive along off-road trails and discover unique natural landscapes.',
    includes: ['Round-trip transportation', 'Double buggy (driver + passenger)', 'Family buggy', 'Buggy guide', 'Cenote visit', 'Stop at Playa Macao'],
    activities: ['Driving an off-road buggy', 'Swimming in a natural cenote', 'Visit to a typical Dominican home', 'Free time on the beach', 'Mamajuana tasting', 'Free time at Playa Macao'],
  },
  'excursion-los-haitises': {
    name: 'Los Haitises Excursion',
    duration: '10 hours',
    description: 'Mangroves, caves with Taíno petroglyphs and movie-worthy landscapes.',
    includes: ['Round-trip transportation from Punta Cana (Bayahíbe guests pay a transfer surcharge)', 'Boat into the park', 'Park guide', 'Typical lunch', 'National park entrance', 'Life jacket'],
    activities: ['Sailing through the mangroves', 'Exploring Taíno caves', 'Exotic bird watching', 'Pre-Columbian pictographs', 'Movie-like landscapes', 'Visit to Montaña Redonda'],
  },
  'coco-bongo': {
    duration: '5 hours',
    description: 'A spectacular show with acrobatics, celebrity impersonators and an open bar at the best nightclub around.',
    includes: ['Round-trip transportation', 'Show entrance', 'Live shows', 'Acrobatics and music', 'Priority access', 'Open bar according to the selected package'],
    activities: ['Spectacular show', 'Live music', 'Celebrity impersonators', 'Aerial acrobatics', 'Party all night'],
    tickets: [
      { name: 'Entrance', includes: '5 drinks' },
      { includes: 'Open bar · General access · Domestic drinks' },
      { includes: 'Open bar · Premium · Premium drinks' },
      { includes: 'Open bar · VIP area · Premium drinks' },
      { includes: 'Open bar · VIP area · Premium drinks' },
    ],
  },
  'zipline-adventure': {
    duration: '4 hours',
    description: 'Fly over the rainforest on 8 extreme zip lines.',
    includes: ['Round-trip transportation', 'Full safety equipment', 'Professional helmet and harness', '8 zip lines', 'Certified guides'],
    activities: ['Zip-lining through the rainforest', 'Spectacular panoramic views', 'Pure adrenaline', 'Crossing hanging bridges'],
  },
  'isla-saona-vip': {
    name: 'Saona Island VIP',
    duration: '8 hours',
    description: 'An exclusive VIP experience on Saona Island with premium service, lobster lunch and access to private areas.',
    includes: ['Round-trip transportation', 'Professional captain and crew', 'Full snorkel equipment', 'Open bar (rum, beer, juices)', 'Access to an exclusive area', 'Professional guide', 'Life jacket', 'Premium lunch'],
    activities: ['Catamaran or speedboat sailing', 'Free time on the beach', 'Visit to the starfish natural pool', 'Music and entertainment', 'Visiting 4 different beaches', 'Visiting the village of Mano Juan', 'Swimming in crystal-clear water'],
  },
  'combo-zipline-buggy': {
    duration: '6 hours',
    description: 'Extreme zip line, buggy and horseback riding combined into one complete adventure.',
    includes: ['Round-trip transportation', '8 zip lines', 'Off-road buggy', 'Full safety equipment', 'Light lunch', 'Certified guides', 'Horseback ride'],
    activities: ['Zip-lining through the jungle', 'Buggy adventure', 'Horseback ride', 'Extreme adrenaline', 'Tropical landscapes'],
  },
  'samana-ballenas-jorobadas': {
    name: 'Samaná Humpback Whale Excursion',
    duration: '12 hours',
    description: 'Watch majestic humpback whales up close in their natural habitat and visit the heavenly beach of Cayo Levantado.',
    includes: ['Round-trip transportation', 'Whale-watching boat', 'Specialized naturalist guide', 'Typical Dominican lunch', 'Visit to Cayo Levantado', 'All entrance fees'],
    activities: ['Humpback whale watching', 'Sailing across Samaná Bay', 'Beach time at Cayo Levantado', 'Whale photography', 'A unique nature experience'],
  },
  'isla-saona-exclusiva': {
    name: 'Saona Island Exclusive',
    duration: '8 hours',
    description: 'Escape the crowds and enjoy Saona Island on an exclusive tour with private areas and VIP service.',
    includes: ['Round-trip transportation', 'Speedboat ride', 'Open bar', 'Exclusive beach area', 'Professional guide', 'Stop at the natural pool', 'Lunch'],
    activities: ['Quieter exclusive beach', 'Fast boat ride', 'Starfish natural pool', 'Quality beach time', 'Premium service', 'VIP experience'],
  },
  'isla-catalina': {
    name: 'Catalina Island',
    duration: '8 hours',
    description: 'A paradise island with pristine reefs perfect for snorkeling and dreamy beaches.',
    includes: ['Round-trip transportation', 'Snorkel and equipment', 'Buffet lunch', 'Open bar', 'Certified guide'],
    activities: ['Snorkeling on pristine reefs', 'Paradise beach', 'Exploring the island', 'Free time on the beach', 'Souvenir photos (not included)'],
  },
  'party-boat': {
    duration: '4 hours',
    description: 'A Caribbean party on a catamaran with DJ, open bar and snorkeling.',
    includes: ['Round-trip transportation', 'Unlimited open bar', 'Catamaran cruise', 'DJ and entertainment', 'Stop at a natural beach'],
    activities: ['Party on board with a DJ', 'Snorkeling', 'Open bar (rum, beer, soft drinks)', 'Water games', 'Cruise along the coast', 'Caribbean music and dancing'],
  },
  'jet-ski-punta-cana': {
    name: 'Jet Ski in Punta Cana',
    duration: '4 hours',
    description: 'Pure adrenaline riding a jet ski across the crystal-clear waters of the Caribbean.',
    includes: ['Round-trip transportation', 'Modern jet ski', 'Life jacket', 'Certified instructor', 'Safety briefing'],
    activities: ['Jet ski', 'Pure adrenaline', 'A thrilling experience'],
  },
  'speed-boat': {
    duration: '4 hours',
    description: 'A fast ride to secret beaches and snorkeling on pristine reefs.',
    includes: ['Round-trip transportation', 'Modern speedboat', 'Experienced captain', 'Life jackets'],
    activities: ['Speedboat ride', 'Visit to secret beaches', 'Snorkeling on a pristine reef'],
  },
  'dolphin-explorer': {
    duration: '3 hours',
    description: 'Swim with dolphins and enjoy a unique, unforgettable educational experience.',
    includes: ['Round-trip transportation', 'Park entrance', 'Dolphin interaction', 'Professional trainer', 'Life jacket', 'Locker use', 'Photos available (extra)'],
    activities: ['Swimming with dolphins', 'Dolphin show', 'Learning about dolphins', 'Educational experience', 'An unforgettable moment'],
  },
  'isla-catalina-con-buceo': {
    name: 'Catalina Island with Scuba Diving',
    duration: '8 hours',
    description: 'Dive into the vibrant coral reefs of Catalina Island with professional equipment and explore the marine life.',
    includes: ['Round-trip transportation', 'Full scuba equipment', 'Certified dive instructor', 'Snorkeling too', 'Buffet lunch', 'Open bar', 'Park entrance'],
    activities: ['Diving on pristine reefs', 'Snorkeling in crystal-clear water', 'Underwater exploration', 'Paradise beach', 'Souvenir photos (not included)'],
  },
  'monkey-land-con-zipline': {
    name: 'Monkey Land with Zipline',
    duration: '6 hours',
    description: 'Combine the thrill of zip lines with a unique encounter with squirrel monkeys in their natural habitat.',
    includes: ['Round-trip transportation', 'Monkey Land entrance', 'Zip lines included', 'Monkey interaction', 'Naturalist guide', 'Botanical tour', 'Light lunch', 'All equipment and training'],
    activities: ['Squirrel monkey interaction', 'Zip lines through the jungle', 'Botanical garden tour', 'Learning about wildlife', 'Photos with the animals', 'Combined adventure'],
  },
  'domitai-park-full-power': {
    duration: '6 hours',
    description: 'Extreme adrenaline with high-speed zip lines and challenging Tibetan bridges in the heart of nature.',
    includes: ['Round-trip transportation', 'Full-power access to every attraction', 'Extreme zip lines', 'Professional safety equipment', 'Certified guides', 'Lunch included'],
    activities: ['High-speed zip lines', 'Tibetan bridges', 'Extreme adventure circuit', 'Pure adrenaline', 'Height challenges'],
  },
  'excursion-samana': {
    name: 'Samaná Excursion',
    duration: '12 hours',
    description: 'Discover the natural beauty of Samaná with a visit to Cayo Levantado and El Limón waterfall.',
    includes: ['Round-trip transportation from Punta Cana (Bayahíbe guests pay a transfer surcharge)', 'Boat or catamaran ride', 'Naturalist guide', 'Typical lunch', 'Visit to Cayo Levantado'],
    activities: ['Panoramic tour of the town', 'Visit to El Limón waterfall', 'Beach at Cayo Levantado', 'Bay cruise', 'Nature photography'],
  },
  'excursion-altos-chavon': {
    name: 'Altos de Chavón Excursion',
    duration: '5 hours',
    description: 'A 16th-century-style Mediterranean village with spectacular views over the Chavón River.',
    includes: ['Round-trip transportation', 'Cultural guide', 'Entrance to Casa de Campo', 'Village tour', 'Visit to the amphitheater', 'Museum visits', 'Free time for shopping', 'Snacks'],
    activities: ['Tour of the Mediterranean village', 'Greco-Roman amphitheater', 'Art galleries', 'Amber Museum', 'Craft shops', 'Views over the Chavón River'],
  },
  'monkey-land': {
    duration: '5 hours',
    description: 'Interact with squirrel monkeys in their natural habitat and enjoy the botanical gardens.',
    includes: ['Round-trip transportation', 'Sanctuary entrance', 'Squirrel monkey interaction', 'Naturalist guide', 'Botanical tour', 'Natural refreshments'],
    activities: ['Monkey interaction', 'Botanical garden tour', 'Learning about wildlife', 'Photos with the animals', 'A unique experience'],
  },
  'bahia-aguilas-vip': {
    name: 'Bahía de las Águilas VIP',
    duration: '2 days',
    description: 'An exclusive experience on the most beautiful beach in the Caribbean, with premium service and gourmet lunch.',
    includes: ['Round-trip transportation', 'Private boat to the bay', 'Meals included: breakfast, lunch and dinner', 'Beach camp', 'Snorkel equipment'],
    activities: ['The most beautiful beach in the Caribbean', 'Pristine crystal-clear water', 'Untouched white sand', 'Snorkeling in turquoise water', 'Visits to San Rafael and Los Patos', 'Movie-like landscapes'],
  },
  'seaquarium-experience': {
    duration: '4 hours',
    description: 'Enjoy interactive shows with dolphins and sea lions and explore fascinating aquariums of Caribbean marine life.',
    includes: ['Round-trip transportation', 'Marine park entrance', 'Dolphin and sea lion shows', 'Access to every aquarium', 'Professional guide', 'Photos available (extra)'],
    activities: ['Interactive marine animal shows', 'Shark and ray viewing', 'Marine educational experience', 'Themed pools', 'Contact with marine animals'],
  },
  'safari-bavaro-runner': {
    duration: '4 hours',
    description: 'Drive an off-road buggy through the Dominican countryside, visit local plantations and enjoy Macao beach.',
    includes: ['Round-trip transportation', 'Visit to a typical home', 'Local product tasting', 'Safari truck transportation', 'Lunch', 'Official guide', 'Fresh fruit'],
    activities: ['Visit to a Dominican plantation', 'Natural cenote', 'Macao beach', 'Off-road adventure', 'Safari truck', 'Visit to the Basílica Catedral Nuestra Señora de la Altagracia'],
  },
  'imagine-punta-cana': {
    duration: '5 hours',
    description: 'A one-of-a-kind nightclub inside a natural cave with 3 music rooms, spectacular lights and an open bar. The most impressive night out in Punta Cana.',
    includes: ['Round-trip transportation', 'Club entrance', 'Open bar according to the selected package', 'Access to the 3 themed caves', 'Live DJ', 'Unique natural cave setting'],
    activities: ['Party in an underground natural cave', 'Latin music (reggaeton, bachata, merengue)', 'Electronic music', '600 m² dance floor', 'A unique experience in the Caribbean'],
    tickets: [
      { includes: 'Open bar with spirits and soft drinks all night' },
      { includes: 'Premium open bar with top-shelf brands' },
      { name: 'VIP Area · Main Room', includes: 'Table in the VIP area of the main room' },
    ],
  },
  'atv-adventure': {
    duration: '4 hours',
    description: 'An extreme ATV adventure over varied terrain, visiting plantations and Playa Macao.',
    includes: ['Round-trip transportation', 'Single or double ATV', 'Helmet and protective gear', 'Lead ATV guide', 'Visit to Playa Macao'],
    activities: ['Riding an ATV over varied terrain', 'Coffee and chocolate tasting', 'Time at Playa Macao', 'Ride through the Dominican countryside'],
  },
  'paseo-caballo-playa': {
    name: 'Horseback Ride on the Beach',
    duration: '1 to 3 hours',
    description: 'A romantic horseback ride along the beach at sunset.',
    includes: ['Round-trip transportation', 'Gentle, trained horse', 'Experienced instructor', 'Safety helmet'],
    activities: ['Horseback ride along the beach', 'Basic riding lesson', 'Photos on horseback', 'Sunset views'],
  },
  'pesca-deportiva': {
    name: 'Sport Fishing',
    duration: '5 hours',
    description: 'Deep-sea fishing in the Caribbean for marlin, mahi-mahi and tuna with professional gear.',
    includes: ['Round-trip transportation', 'Professional fishing boat', 'Experienced captain', 'Full fishing gear', 'Bait and lures', 'Drinks and snacks', 'Fishing license', 'Ice to keep your catch'],
    activities: ['Deep-sea fishing in the Caribbean', 'Catching marlin, mahi-mahi and tuna', 'Professional fishing techniques', 'Fighting big fish', 'You can keep your catch'],
  },
  'samana-vip': {
    name: 'Samaná VIP Like Never Before',
    duration: '2 days',
    description: 'A luxury tour of Samaná with a premium catamaran, gourmet lunch and exclusive access to Cayo Levantado.',
    includes: ['Round-trip transportation', 'Accommodation', 'Meals included: breakfast, lunch and dinner', 'Access to Cayo Levantado'],
    activities: ['Playa Rincón', 'Caño Frío', 'El Limón waterfall', 'Cayo Levantado beach (Bacardí Island)', 'Tour of the town of Samaná', 'Personalized premium service', 'Exclusive experience'],
  },
  'caribbean-pirates': {
    duration: '4 hours',
    description: 'Live a pirate adventure on a themed ship with a live show, snorkeling and fun for the whole family.',
    includes: ['Round-trip transportation', 'Pirate ship cruise', 'Live pirate show', 'Unlimited open bar', 'Snorkeling', 'Entertainment and activities'],
    activities: ['Interactive pirate show', 'Sailing on a themed ship', 'Snorkeling at a Caribbean stop', 'Games and contests', 'Fun for the whole family'],
  },
  'city-tour-santo-domingo': {
    name: 'Santo Domingo City Tour',
    duration: '10 hours',
    description: 'Explore the first colonial city of the Americas with a historian guide through the Colonial Zone.',
    includes: ['Round-trip transportation', 'Historian guide', 'Typical Dominican lunch', 'Museum entrance fees', 'Walking tour of the Colonial Zone'],
    activities: ['Cathedral of Santa María la Menor', 'Alcázar de Colón', 'Ozama Fortress', 'Calle Las Damas', 'Los Tres Ojos', 'Columbus Lighthouse', 'Shopping at local markets'],
  },
  'scuba-doo': {
    duration: '3 hours',
    description: 'Explore the underwater world on a sea scooter, no diving certification required.',
    includes: ['Round-trip transportation', 'Individual Scuba Doo sea scooter', 'Clear-dome helmet', 'Professional instructor', 'Safety briefing', 'Reef exploration', 'Underwater photos (extra)'],
    activities: ['Riding a sea scooter', 'Exploring coral reefs', 'Seeing tropical fish up close', 'A unique underwater experience', 'No diving certification needed'],
  },
  'la-hacienda-park': {
    duration: '5 hours',
    description: 'An adventure park with zip lines, hanging bridges and thrilling circuits for all ages.',
    includes: ['Round-trip transportation', 'Access to every attraction', 'Full safety equipment', 'Professional guides', 'Light lunch', 'Soft drinks'],
    activities: ['Multiple zip lines', 'Hanging bridges', 'Adventure circuit', 'Family activities', 'Fun for all ages'],
  },
  'city-tour-higuey': {
    name: 'Higüey City Tour',
    duration: '4 or 5 hours',
    description: 'Visit the Basilica of Higüey and get to know local Dominican culture.',
    includes: ['Round-trip transportation', 'Basilica entrance', 'Visit to the local market', 'Coffee and cocoa tastings', 'Lunch (optional extra)'],
    activities: ['Basilica of Higüey', 'San Dionisio Church', 'Visit to a typical Dominican home', 'Traditional local market', 'Dominican culture', 'Craft shopping', 'Architectural photography'],
  },
  'shopping-artesanal': {
    name: 'Artisan Shopping Tour',
    duration: '4 hours',
    description: 'Visit local markets with handicrafts, larimar, amber and typical Dominican products.',
    includes: ['Round-trip transportation', 'Visits to several shops', 'Craft demonstration'],
    activities: ['Local handicraft shopping', 'Larimar and amber jewelry', 'Authentic Dominican art', 'Cocoa and coffee products', 'Rum and typical souvenirs'],
  },
  'city-tour-punta-cana': {
    name: 'Punta Cana City Tour',
    duration: '5 or 6 hours',
    description: "Tour Punta Cana's landmark spots and shopping areas.",
    includes: ['Round-trip transportation', 'Visits to key spots', 'Shopping time', 'Souvenir photos'],
    activities: ['Playa Macao (optional)', 'Shopping malls', 'Hotel zone', 'Landmark spots', 'Local shopping'],
  },
};
