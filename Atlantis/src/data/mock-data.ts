import type { RoomCategory } from '../types'

const amenitiesBase = [
  'Walk-in rain shower',
  'Minibar with complimentary soft drinks',
  'Private balcony',
  'High-speed Wi-Fi',
  '55" smart television',
  'Nespresso coffee machine',
  'Luxury bath amenities',
  'In-room safe',
  'USB charging outlets',
  'Blackout curtains',
]

const perksBase = [
  'Unlimited Aquaventure Waterpark access',
  'Complimentary fitness centre access',
  'Kids Club privileges',
  'Beach & pool towels',
  'Daily housekeeping',
]

const clubPerks = [
  ...perksBase,
  'Club Lounge breakfast & evening canapes',
  'Priority restaurant reservations',
  'Late checkout subject to availability',
]

const suitePerks = [
  ...clubPerks,
  'Private butler service on request',
  'Welcome champagne & fruit platter',
  'Exclusive spa credit AED 500',
]

export const FEE_RATES = {
  serviceCharge: 0.1,
  municipalityFee: 0.07,
  vat: 0.05,
} as const

export const CURRENCY_RATES: Record<string, number> = {
  AED: 1,
  USD: 0.272,
  EUR: 0.25,
  GBP: 0.215,
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  AED: 'AED',
  USD: '$',
  EUR: 'EUR',
  GBP: 'GBP',
}

export const roomCategories: RoomCategory[] = [
  {
    id: 'king-rooms',
    name: 'King Rooms',
    rooms: [
      {
        id: 'ocean-king',
        name: 'Ocean King',
        bedType: 'King',
        view: 'Ocean',
        maxOccupancy: 2,
        sizeSqm: 45,
        description:
          'Wake to sweeping Arabian Gulf views from a serene king bedroom with warm coastal interiors and a private balcony.',
        image:
          '/rooms/room-1.jpg',
        gallery: [
          '/rooms/room-2.jpg',
          '/rooms/room-3.jpg',
          '/rooms/room-4.jpg',
        ],
        amenities: amenitiesBase,
        perks: perksBase,
        ratePlans: [
          {
            id: 'ok-ro',
            name: 'Room Only',
            nightlyRate: 1200,
            description: 'Accommodation only',
          },
          {
            id: 'ok-bb',
            name: 'Bed & Breakfast',
            nightlyRate: 1450,
            description: 'Daily breakfast for two',
          },
          {
            id: 'ok-hb',
            name: 'Half Board',
            nightlyRate: 1750,
            description: 'Breakfast and dinner for two',
          },
          {
            id: 'ok-fb',
            name: 'Full Board',
            nightlyRate: 2050,
            description: 'Breakfast, lunch and dinner',
          },
        ],
      },
      {
        id: 'palm-king',
        name: 'Palm King',
        bedType: 'King',
        view: 'Palm',
        maxOccupancy: 2,
        sizeSqm: 42,
        description:
          'Overlook the iconic palm fronds from a refined king suite of calm neutrals and soft natural light.',
        image:
          '/rooms/room-5.jpg',
        gallery: [
          '/rooms/room-1.jpg',
          '/rooms/room-2.jpg',
        ],
        amenities: amenitiesBase,
        perks: perksBase,
        ratePlans: [
          {
            id: 'pk-ro',
            name: 'Room Only',
            nightlyRate: 1100,
            description: 'Accommodation only',
          },
          {
            id: 'pk-bb',
            name: 'Bed & Breakfast',
            nightlyRate: 1350,
            description: 'Daily breakfast for two',
          },
          {
            id: 'pk-hb',
            name: 'Half Board',
            nightlyRate: 1650,
            description: 'Breakfast and dinner for two',
          },
        ],
      },
    ],
  },
  {
    id: 'queen-rooms',
    name: 'Queen Rooms',
    rooms: [
      {
        id: 'garden-queen',
        name: 'Garden Queen',
        bedType: 'Queen',
        view: 'Garden',
        maxOccupancy: 2,
        sizeSqm: 38,
        description:
          'A tranquil queen room framed by landscaped gardens — ideal for couples seeking quiet luxury.',
        image:
          '/rooms/room-3.jpg',
        gallery: [
          '/rooms/room-4.jpg',
          '/rooms/room-5.jpg',
        ],
        amenities: amenitiesBase,
        perks: perksBase,
        ratePlans: [
          {
            id: 'gq-ro',
            name: 'Room Only',
            nightlyRate: 980,
            description: 'Accommodation only',
          },
          {
            id: 'gq-bb',
            name: 'Bed & Breakfast',
            nightlyRate: 1180,
            description: 'Daily breakfast for two',
          },
          {
            id: 'gq-hb',
            name: 'Half Board',
            nightlyRate: 1480,
            description: 'Breakfast and dinner for two',
          },
        ],
      },
      {
        id: 'pool-queen',
        name: 'Pool Queen',
        bedType: 'Queen',
        view: 'Pool',
        maxOccupancy: 2,
        sizeSqm: 40,
        description:
          'Watch the lagoon shimmer from your balcony in this light-filled queen room with poolside energy.',
        image:
          '/rooms/room-1.jpg',
        gallery: [
          '/rooms/room-2.jpg',
        ],
        amenities: amenitiesBase,
        perks: perksBase,
        ratePlans: [
          {
            id: 'pq-ro',
            name: 'Room Only',
            nightlyRate: 1050,
            description: 'Accommodation only',
          },
          {
            id: 'pq-bb',
            name: 'Bed & Breakfast',
            nightlyRate: 1280,
            description: 'Daily breakfast for two',
          },
        ],
      },
    ],
  },
  {
    id: 'club-king',
    name: 'Club King',
    rooms: [
      {
        id: 'club-ocean-king',
        name: 'Club Ocean King',
        bedType: 'King',
        view: 'Ocean',
        maxOccupancy: 2,
        sizeSqm: 48,
        description:
          'Elevated club privileges meet panoramic ocean vistas — breakfast, canapes, and priority access included.',
        image:
          '/rooms/room-3.jpg',
        gallery: [
          '/rooms/room-4.jpg',
          '/rooms/room-5.jpg',
        ],
        amenities: [...amenitiesBase, 'Club Lounge access'],
        perks: clubPerks,
        ratePlans: [
          {
            id: 'cok-ro',
            name: 'Room Only',
            nightlyRate: 1800,
            description: 'Club access included',
          },
          {
            id: 'cok-bb',
            name: 'Bed & Breakfast',
            nightlyRate: 2100,
            description: 'Club breakfast & lounge',
          },
          {
            id: 'cok-hb',
            name: 'Half Board',
            nightlyRate: 2500,
            description: 'Breakfast, dinner & club lounge',
          },
        ],
      },
    ],
  },
  {
    id: 'club-queen',
    name: 'Club Queen',
    rooms: [
      {
        id: 'club-garden-queen',
        name: 'Club Garden Queen',
        bedType: 'Queen',
        view: 'Garden',
        maxOccupancy: 2,
        sizeSqm: 44,
        description:
          'Club-level comfort with serene garden outlooks and exclusive lounge hospitality throughout your stay.',
        image:
          '/rooms/room-1.jpg',
        gallery: [
          '/rooms/room-2.jpg',
        ],
        amenities: [...amenitiesBase, 'Club Lounge access'],
        perks: clubPerks,
        ratePlans: [
          {
            id: 'cgq-ro',
            name: 'Room Only',
            nightlyRate: 1600,
            description: 'Club access included',
          },
          {
            id: 'cgq-bb',
            name: 'Bed & Breakfast',
            nightlyRate: 1900,
            description: 'Club breakfast & lounge',
          },
        ],
      },
    ],
  },
  {
    id: 'suites',
    name: 'Suites',
    rooms: [
      {
        id: 'executive-suite',
        name: 'Executive Suite',
        bedType: 'King',
        view: 'Ocean',
        maxOccupancy: 3,
        sizeSqm: 85,
        description:
          'Separate living lounge and bedroom with floor-to-ceiling ocean glass — crafted for unhurried stays.',
        image:
          '/rooms/room-3.jpg',
        gallery: [
          '/rooms/room-4.jpg',
          '/rooms/room-5.jpg',
        ],
        amenities: [
          ...amenitiesBase,
          'Separate living area',
          'Dining space for four',
          'Guest powder room',
        ],
        perks: suitePerks,
        ratePlans: [
          {
            id: 'es-ro',
            name: 'Room Only',
            nightlyRate: 3200,
            description: 'Suite accommodation',
          },
          {
            id: 'es-bb',
            name: 'Bed & Breakfast',
            nightlyRate: 3700,
            description: 'Daily breakfast for two',
          },
          {
            id: 'es-hb',
            name: 'Half Board',
            nightlyRate: 4300,
            description: 'Breakfast and dinner for two',
          },
        ],
      },
      {
        id: 'royal-suite',
        name: 'Royal Suite',
        bedType: 'King',
        view: 'Palm',
        maxOccupancy: 4,
        sizeSqm: 120,
        description:
          'Expansive suite living with dual balconies and bespoke furnishings overlooking the palm crown.',
        image:
          '/rooms/room-1.jpg',
        gallery: [
          '/rooms/room-2.jpg',
        ],
        amenities: [
          ...amenitiesBase,
          'Two balconies',
          'Walk-in wardrobe',
          'Soaking tub',
        ],
        perks: suitePerks,
        ratePlans: [
          {
            id: 'rs-ro',
            name: 'Room Only',
            nightlyRate: 4800,
            description: 'Suite accommodation',
          },
          {
            id: 'rs-bb',
            name: 'Bed & Breakfast',
            nightlyRate: 5400,
            description: 'Daily breakfast for two',
          },
        ],
      },
    ],
  },
  {
    id: 'family-rooms',
    name: 'Family Rooms',
    rooms: [
      {
        id: 'family-connecting',
        name: 'Family Connecting',
        bedType: 'King',
        view: 'Garden',
        maxOccupancy: 5,
        sizeSqm: 72,
        description:
          'Connecting king and twin rooms designed for families — space to gather and rest in equal measure.',
        image:
          '/rooms/room-3.jpg',
        gallery: [
          '/rooms/room-4.jpg',
          '/rooms/room-5.jpg',
        ],
        amenities: [
          ...amenitiesBase,
          'Connecting twin room',
          'Extra sofa bed',
          'Kids welcome amenities',
        ],
        perks: [
          ...perksBase,
          'Kids Club full-day access',
          'Family pool cabana discount',
        ],
        ratePlans: [
          {
            id: 'fc-ro',
            name: 'Room Only',
            nightlyRate: 2200,
            description: 'Two connecting rooms',
          },
          {
            id: 'fc-bb',
            name: 'Bed & Breakfast',
            nightlyRate: 2800,
            description: 'Breakfast for family of four',
          },
          {
            id: 'fc-hb',
            name: 'Half Board',
            nightlyRate: 3400,
            description: 'Breakfast & dinner for four',
          },
        ],
      },
    ],
  },
  {
    id: 'presidential',
    name: 'Presidential Suite',
    rooms: [
      {
        id: 'presidential-suite',
        name: 'The Serrano Presidential',
        bedType: 'King',
        view: 'Ocean',
        maxOccupancy: 6,
        sizeSqm: 280,
        description:
          'The pinnacle of Serrano hospitality — private terrace, dedicated butler, and uninterrupted Gulf horizons.',
        image:
          '/rooms/room-1.jpg',
        gallery: [
          '/rooms/room-2.jpg',
          '/rooms/room-3.jpg',
          '/rooms/room-4.jpg',
        ],
        amenities: [
          ...amenitiesBase,
          'Private infinity terrace',
          'Full butler kitchen',
          'Grand dining for eight',
          'Media lounge',
          'Master spa bathroom',
          'Guest suite',
        ],
        perks: [
          ...suitePerks,
          'Dedicated butler 24/7',
          'Private yacht transfer credit',
          'In-suite chef dinner once per stay',
        ],
        ratePlans: [
          {
            id: 'ps-ro',
            name: 'Room Only',
            nightlyRate: 12000,
            description: 'Presidential accommodation',
          },
          {
            id: 'ps-bb',
            name: 'Bed & Breakfast',
            nightlyRate: 13500,
            description: 'Gourmet breakfast for six',
          },
          {
            id: 'ps-hb',
            name: 'Half Board',
            nightlyRate: 15500,
            description: 'Breakfast & fine dining dinner',
          },
          {
            id: 'ps-fb',
            name: 'Full Board',
            nightlyRate: 18000,
            description: 'All meals with private chef option',
          },
        ],
      },
    ],
  },
]

export const alerts = [
  {
    id: '1',
    title: 'Pool Maintenance Notice',
    message:
      'The main lagoon pool will undergo scheduled maintenance on 15–16 August. The infinity and family pools remain open.',
  },
  {
    id: '2',
    title: 'Aquaventure Hours',
    message:
      'Waterpark operating hours are extended to 9 PM throughout the summer season.',
  },
]
