import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const artworks = await prisma.artwork.findMany({
    select: { id: true, title: true, imageUrl: true },
    where: { imageUrl: { not: null } },
    orderBy: { museumId: 'asc' }
  })
  artworks.forEach(a => console.log(`${a.id} | ${a.imageUrl}`))
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
