import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const artworks = await prisma.artwork.findMany({
    select: { id: true, title: true, artist: true, year: true, imageUrl: true, museumId: true },
    orderBy: { museumId: 'asc' }
  })
  console.log('Total artworks:', artworks.length)
  console.log('')
  artworks.forEach(a => {
    const img = a.imageUrl ? 'HAS_IMAGE' : 'NO_IMAGE'
    console.log(`${img} | ${a.museumId} | ${a.id} | ${a.title} | ${a.artist}`)
  })
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
