import { PrismaClient, BedType, ViewType, BoardType, AdminRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Serrano database...')

  // ─── Admin Users ──────────────────────────────────────────────────────────
  const superAdminPassword = await bcrypt.hash('Admin@1234', 12)
  const superAdmin = await prisma.adminUser.upsert({
    where: { email: 'admin@serrano.hotel' },
    update: {},
    create: {
      email: 'admin@serrano.hotel',
      password: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: AdminRole.SUPER_ADMIN,
    },
  })

  const managerPassword = await bcrypt.hash('Manager@1234', 12)
  await prisma.adminUser.upsert({
    where: { email: 'reservations@serrano.hotel' },
    update: {},
    create: {
      email: 'reservations@serrano.hotel',
      password: managerPassword,
      firstName: 'Reservations',
      lastName: 'Manager',
      role: AdminRole.RESERVATIONS_MANAGER,
    },
  })

  const editorPassword = await bcrypt.hash('Editor@1234', 12)
  await prisma.adminUser.upsert({
    where: { email: 'content@serrano.hotel' },
    update: {},
    create: {
      email: 'content@serrano.hotel',
      password: editorPassword,
      firstName: 'Content',
      lastName: 'Editor',
      role: AdminRole.CONTENT_EDITOR,
    },
  })

  console.log('✓ Admin users created')

  // ─── Currency Rates ───────────────────────────────────────────────────────
  const currencyRates = [
    { fromCurrency: 'AED', toCurrency: 'USD', rate: 0.272 },
    { fromCurrency: 'AED', toCurrency: 'EUR', rate: 0.25 },
    { fromCurrency: 'AED', toCurrency: 'GBP', rate: 0.215 },
  ]
  for (const r of currencyRates) {
    await prisma.currencyRate.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency: r.fromCurrency, toCurrency: r.toCurrency } },
      update: { rate: r.rate },
      create: r,
    })
  }
  console.log('✓ Currency rates seeded')

  // ─── Hotel Alerts ─────────────────────────────────────────────────────────
  await prisma.hotelAlert.createMany({
    data: [
      { title: 'Pool Maintenance Notice', message: 'The main lagoon pool will undergo scheduled maintenance on 15–16 August. The infinity and family pools remain open.', sortOrder: 0 },
      { title: 'Aquaventure Hours', message: 'Waterpark operating hours are extended to 9 PM throughout the summer season.', sortOrder: 1 },
    ],
    skipDuplicates: true,
  })
  console.log('✓ Hotel alerts seeded')

  // ─── Room Data ────────────────────────────────────────────────────────────
  const amenitiesBase = [
    'Walk-in rain shower', 'Minibar with complimentary soft drinks', 'Private balcony',
    'High-speed Wi-Fi', '55" smart television', 'Nespresso coffee machine',
    'Luxury bath amenities', 'In-room safe', 'USB charging outlets', 'Blackout curtains',
  ]
  const perksBase = [
    'Unlimited Aquaventure Waterpark access', 'Complimentary fitness centre access',
    'Kids Club privileges', 'Beach & pool towels', 'Daily housekeeping',
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

  function makeAmenities(amenities: string[], perks: string[]) {
    return [
      ...amenities.map((name, i) => ({ name, category: 'AMENITY' as const, sortOrder: i })),
      ...perks.map((name, i) => ({ name, category: 'PERK' as const, sortOrder: i })),
    ]
  }

  const categories = [
    {
      name: 'King Rooms',
      slug: 'king-rooms',
      displayOrder: 0,
      rooms: [
        {
          name: 'Ocean King',
          slug: 'ocean-king',
          bedType: BedType.KING,
          viewType: ViewType.OCEAN,
          maxOccupancy: 2,
          sizeSqm: 45,
          description: 'Wake to sweeping Arabian Gulf views from a serene king bedroom with warm coastal interiors and a private balcony.',
          mainImage: '/rooms/room-1.jpg',
          images: ['/rooms/room-2.jpg', '/rooms/room-3.jpg', '/rooms/room-4.jpg'],
          amenities: makeAmenities(amenitiesBase, perksBase),
          ratePlans: [
            { name: BoardType.ROOM_ONLY, description: 'Accommodation only', basePrice: 1200 },
            { name: BoardType.BED_AND_BREAKFAST, description: 'Daily breakfast for two', basePrice: 1450 },
            { name: BoardType.HALF_BOARD, description: 'Breakfast and dinner for two', basePrice: 1750 },
            { name: BoardType.FULL_BOARD, description: 'Breakfast, lunch and dinner', basePrice: 2050 },
          ],
        },
        {
          name: 'Palm King',
          slug: 'palm-king',
          bedType: BedType.KING,
          viewType: ViewType.PALM,
          maxOccupancy: 2,
          sizeSqm: 42,
          description: 'Overlook the iconic palm fronds from a refined king suite of calm neutrals and soft natural light.',
          mainImage: '/rooms/room-5.jpg',
          images: ['/rooms/room-1.jpg', '/rooms/room-2.jpg'],
          amenities: makeAmenities(amenitiesBase, perksBase),
          ratePlans: [
            { name: BoardType.ROOM_ONLY, description: 'Accommodation only', basePrice: 1100 },
            { name: BoardType.BED_AND_BREAKFAST, description: 'Daily breakfast for two', basePrice: 1350 },
            { name: BoardType.HALF_BOARD, description: 'Breakfast and dinner for two', basePrice: 1650 },
          ],
        },
      ],
    },
    {
      name: 'Queen Rooms',
      slug: 'queen-rooms',
      displayOrder: 1,
      rooms: [
        {
          name: 'Garden Queen',
          slug: 'garden-queen',
          bedType: BedType.QUEEN,
          viewType: ViewType.GARDEN,
          maxOccupancy: 2,
          sizeSqm: 38,
          description: 'A tranquil queen room framed by landscaped gardens — ideal for couples seeking quiet luxury.',
          mainImage: '/rooms/room-3.jpg',
          images: ['/rooms/room-4.jpg', '/rooms/room-5.jpg'],
          amenities: makeAmenities(amenitiesBase, perksBase),
          ratePlans: [
            { name: BoardType.ROOM_ONLY, description: 'Accommodation only', basePrice: 980 },
            { name: BoardType.BED_AND_BREAKFAST, description: 'Daily breakfast for two', basePrice: 1180 },
            { name: BoardType.HALF_BOARD, description: 'Breakfast and dinner for two', basePrice: 1480 },
          ],
        },
        {
          name: 'Pool Queen',
          slug: 'pool-queen',
          bedType: BedType.QUEEN,
          viewType: ViewType.POOL,
          maxOccupancy: 2,
          sizeSqm: 40,
          description: 'Watch the lagoon shimmer from your balcony in this light-filled queen room with poolside energy.',
          mainImage: '/rooms/room-1.jpg',
          images: ['/rooms/room-2.jpg'],
          amenities: makeAmenities(amenitiesBase, perksBase),
          ratePlans: [
            { name: BoardType.ROOM_ONLY, description: 'Accommodation only', basePrice: 1050 },
            { name: BoardType.BED_AND_BREAKFAST, description: 'Daily breakfast for two', basePrice: 1280 },
          ],
        },
      ],
    },
    {
      name: 'Club King',
      slug: 'club-king',
      displayOrder: 2,
      rooms: [
        {
          name: 'Club Ocean King',
          slug: 'club-ocean-king',
          bedType: BedType.KING,
          viewType: ViewType.OCEAN,
          maxOccupancy: 2,
          sizeSqm: 48,
          description: 'Elevated club privileges meet panoramic ocean vistas — breakfast, canapes, and priority access included.',
          mainImage: '/rooms/room-3.jpg',
          images: ['/rooms/room-4.jpg', '/rooms/room-5.jpg'],
          amenities: makeAmenities([...amenitiesBase, 'Club Lounge access'], clubPerks),
          ratePlans: [
            { name: BoardType.ROOM_ONLY, description: 'Club access included', basePrice: 1800 },
            { name: BoardType.BED_AND_BREAKFAST, description: 'Club breakfast & lounge', basePrice: 2100 },
            { name: BoardType.HALF_BOARD, description: 'Breakfast, dinner & club lounge', basePrice: 2500 },
          ],
        },
      ],
    },
    {
      name: 'Club Queen',
      slug: 'club-queen',
      displayOrder: 3,
      rooms: [
        {
          name: 'Club Garden Queen',
          slug: 'club-garden-queen',
          bedType: BedType.QUEEN,
          viewType: ViewType.GARDEN,
          maxOccupancy: 2,
          sizeSqm: 44,
          description: 'Club-level comfort with serene garden outlooks and exclusive lounge hospitality throughout your stay.',
          mainImage: '/rooms/room-1.jpg',
          images: ['/rooms/room-2.jpg'],
          amenities: makeAmenities([...amenitiesBase, 'Club Lounge access'], clubPerks),
          ratePlans: [
            { name: BoardType.ROOM_ONLY, description: 'Club access included', basePrice: 1600 },
            { name: BoardType.BED_AND_BREAKFAST, description: 'Club breakfast & lounge', basePrice: 1900 },
          ],
        },
      ],
    },
    {
      name: 'Suites',
      slug: 'suites',
      displayOrder: 4,
      rooms: [
        {
          name: 'Executive Suite',
          slug: 'executive-suite',
          bedType: BedType.KING,
          viewType: ViewType.OCEAN,
          maxOccupancy: 3,
          sizeSqm: 85,
          description: 'Separate living lounge and bedroom with floor-to-ceiling ocean glass — crafted for unhurried stays.',
          mainImage: '/rooms/room-3.jpg',
          images: ['/rooms/room-4.jpg', '/rooms/room-5.jpg'],
          amenities: makeAmenities([...amenitiesBase, 'Separate living area', 'Dining space for four', 'Guest powder room'], suitePerks),
          ratePlans: [
            { name: BoardType.ROOM_ONLY, description: 'Suite accommodation', basePrice: 3200 },
            { name: BoardType.BED_AND_BREAKFAST, description: 'Daily breakfast for two', basePrice: 3700 },
            { name: BoardType.HALF_BOARD, description: 'Breakfast and dinner for two', basePrice: 4300 },
          ],
        },
        {
          name: 'Royal Suite',
          slug: 'royal-suite',
          bedType: BedType.KING,
          viewType: ViewType.PALM,
          maxOccupancy: 4,
          sizeSqm: 120,
          description: 'Expansive suite living with dual balconies and bespoke furnishings overlooking the palm crown.',
          mainImage: '/rooms/room-1.jpg',
          images: ['/rooms/room-2.jpg'],
          amenities: makeAmenities([...amenitiesBase, 'Two balconies', 'Walk-in wardrobe', 'Soaking tub'], suitePerks),
          ratePlans: [
            { name: BoardType.ROOM_ONLY, description: 'Suite accommodation', basePrice: 4800 },
            { name: BoardType.BED_AND_BREAKFAST, description: 'Daily breakfast for two', basePrice: 5400 },
          ],
        },
      ],
    },
    {
      name: 'Family Rooms',
      slug: 'family-rooms',
      displayOrder: 5,
      rooms: [
        {
          name: 'Family Connecting',
          slug: 'family-connecting',
          bedType: BedType.KING,
          viewType: ViewType.GARDEN,
          maxOccupancy: 5,
          sizeSqm: 72,
          description: 'Connecting king and twin rooms designed for families — space to gather and rest in equal measure.',
          mainImage: '/rooms/room-3.jpg',
          images: ['/rooms/room-4.jpg', '/rooms/room-5.jpg'],
          amenities: makeAmenities([...amenitiesBase, 'Connecting twin room', 'Extra sofa bed', 'Kids welcome amenities'], [...perksBase, 'Kids Club full-day access', 'Family pool cabana discount']),
          ratePlans: [
            { name: BoardType.ROOM_ONLY, description: 'Two connecting rooms', basePrice: 2200 },
            { name: BoardType.BED_AND_BREAKFAST, description: 'Breakfast for family of four', basePrice: 2800 },
            { name: BoardType.HALF_BOARD, description: 'Breakfast & dinner for four', basePrice: 3400 },
          ],
        },
      ],
    },
    {
      name: 'Presidential Suite',
      slug: 'presidential',
      displayOrder: 6,
      rooms: [
        {
          name: 'The Serrano Presidential',
          slug: 'presidential-suite',
          bedType: BedType.KING,
          viewType: ViewType.OCEAN,
          maxOccupancy: 6,
          sizeSqm: 280,
          description: 'The pinnacle of Serrano hospitality — private terrace, dedicated butler, and uninterrupted Gulf horizons.',
          mainImage: '/rooms/room-1.jpg',
          images: ['/rooms/room-2.jpg', '/rooms/room-3.jpg', '/rooms/room-4.jpg'],
          amenities: makeAmenities([...amenitiesBase, 'Private infinity terrace', 'Full butler kitchen', 'Grand dining for eight', 'Media lounge', 'Master spa bathroom', 'Guest suite'], [...suitePerks, 'Dedicated butler 24/7', 'Private yacht transfer credit', 'In-suite chef dinner once per stay']),
          ratePlans: [
            { name: BoardType.ROOM_ONLY, description: 'Presidential accommodation', basePrice: 12000 },
            { name: BoardType.BED_AND_BREAKFAST, description: 'Gourmet breakfast for six', basePrice: 13500 },
            { name: BoardType.HALF_BOARD, description: 'Breakfast & fine dining dinner', basePrice: 15500 },
            { name: BoardType.FULL_BOARD, description: 'All meals with private chef option', basePrice: 18000 },
          ],
        },
      ],
    },
  ]

  for (const catData of categories) {
    const { rooms, ...catFields } = catData

    const cat = await prisma.roomCategory.upsert({
      where: { slug: catFields.slug },
      update: { name: catFields.name, displayOrder: catFields.displayOrder },
      create: { ...catFields, description: '' },
    })

    for (const roomData of rooms) {
      const { images, amenities, ratePlans, ...roomFields } = roomData

      const existing = await prisma.roomType.findUnique({ where: { slug: roomFields.slug } })
      if (!existing) {
        const room = await prisma.roomType.create({
          data: {
            ...roomFields,
            categoryId: cat.id,
            images: { create: images.map((url, i) => ({ url, sortOrder: i + 1 })) },
            amenities: { create: amenities },
          },
        })

        await prisma.ratePlan.createMany({
          data: ratePlans.map((rp) => ({ ...rp, roomTypeId: room.id })),
        })

        console.log(`  ✓ ${cat.name} → ${room.name}`)
      }
    }
  }

  // ─── Sample Promo Code ────────────────────────────────────────────────────
  await prisma.promoCode.upsert({
    where: { code: 'SERRANO10' },
    update: {},
    create: {
      code: 'SERRANO10',
      description: '10% off all room types',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      isActive: true,
      applicableToAll: true,
    },
  })

  await prisma.promoCode.upsert({
    where: { code: 'WELCOME500' },
    update: {},
    create: {
      code: 'WELCOME500',
      description: 'AED 500 off your stay',
      discountType: 'FIXED_AED',
      discountValue: 500,
      isActive: true,
      applicableToAll: true,
    },
  })

  console.log('✓ Promo codes seeded')

  // ─── Demo Guest ───────────────────────────────────────────────────────────
  const guestPassword = await bcrypt.hash('Guest@1234', 12)
  await prisma.guest.upsert({
    where: { email: 'guest@serrano.hotel' },
    update: {},
    create: {
      email: 'guest@serrano.hotel',
      password: guestPassword,
      firstName: 'Demo',
      lastName: 'Guest',
      phone: '+971500000000',
      country: 'AE',
      city: 'Dubai',
    },
  })
  console.log('✓ Demo guest created')

  console.log('')
  console.log('🎉 Seed complete!')
  console.log('')
  console.log('Admin credentials:')
  console.log('  Super Admin:        admin@serrano.hotel / Admin@1234')
  console.log('  Reservations Mgr:   reservations@serrano.hotel / Manager@1234')
  console.log('  Content Editor:     content@serrano.hotel / Editor@1234')
  console.log('')
  console.log('Guest credentials:')
  console.log('  Demo Guest:         guest@serrano.hotel / Guest@1234')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
