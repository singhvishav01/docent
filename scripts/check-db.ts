import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const museums = await prisma.museum.findMany({
    include: { _count: { select: { artworks: true } } },
    orderBy: { name: 'asc' }
  })

  console.log('Museums:')
  for (const m of museums) {
    console.log(` - ${m.id} | ${m.name} | artworks: ${m._count.artworks}`)
  }

const artworks = await prisma.artwork.findMany({ 
    take: 10,
    include: { Museum: { select: { id: true } } }
})
  console.log(`\nSample artworks (${artworks.length} shown):`)
  for (const a of artworks) {
    console.log(` - ${a.id} | ${a.title} | museumId: ${a.museum.id}`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Check DB failed:', e)
  process.exit(1)
})
