import '../src/load-env'
import { prisma } from '../src/config/database'

/** Point Palm King (714507) at Limiria villa photos in public/villa. */
async function main() {
  const room = await prisma.roomType.findFirst({
    where: {
      OR: [
        { slug: 'palm-king' },
        { lodgifyPropertyId: 714507 },
        { name: { contains: 'Palm' } },
      ],
    },
    include: { images: true },
  })

  if (!room) {
    console.error('Palm King room type not found')
    process.exit(1)
  }

  const gallery = [
    '/villa/villa-pool.png',
    '/villa/villa-gate.png',
    '/villa/villa-bcom-1.jpg',
    '/villa/villa-bcom-2.jpg',
  ]

  await prisma.roomType.update({
    where: { id: room.id },
    data: {
      name: 'Limiria Villa Zanzibar',
      slug: 'limiria-villa-zanzibar',
      description:
        'Overlook the iconic palm fronds from a refined private villa of calm neutrals and soft natural light — pool deck, open lounges, and the entire home reserved for your stay.',
      mainImage: gallery[0],
      viewType: 'PALM',
    },
  })

  await prisma.roomImage.deleteMany({ where: { roomTypeId: room.id } })
  await prisma.roomImage.createMany({
    data: gallery.map((url, i) => ({
      roomTypeId: room.id,
      url,
      sortOrder: i,
      alt: `Limiria Villa Zanzibar — photo ${i + 1}`,
    })),
  })

  console.log('Updated villa:', room.id, '→ Limiria Villa Zanzibar with', gallery.length, 'images')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  try { await prisma.$disconnect() } catch (_) {}
  process.exit(1)
})
