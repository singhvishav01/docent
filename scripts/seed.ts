// scripts/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Running seed script (scripts/seed.ts)')

  // Ensure admin user exists
  const adminPassword = bcrypt.hashSync('admin123', 8)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@docent.app' },
    update: { name: 'Admin User', role: 'admin', password: adminPassword },
    create: {
      id: 'admin-user-1',
      email: 'admin@docent.app',
      name: 'Admin User',
      role: 'admin',
      password: adminPassword
    }
  })

  console.log(`✅ Admin ready: ${admin.email} (password: admin123)`) 

  // Museums to create
  const museums = [
    { id: 'met', name: 'Metropolitan Museum of Art', description: 'Metropolitan Museum of Art', location: 'New York, NY' },
    { id: 'moma', name: 'Museum of Modern Art', description: 'Museum of Modern Art', location: 'New York, NY' },
    { id: 'louvre', name: 'Louvre Museum', description: 'Louvre Museum', location: 'Paris, France' }
  ]

  for (const m of museums) {
    await prisma.museum.upsert({
      where: { id: m.id },
      update: { name: m.name, description: m.description, location: m.location },
      create: { id: m.id, name: m.name, description: m.description, location: m.location }
    })
    console.log(`✅ Museum upserted: ${m.id}`)
  }

  // Simple artworks for each museum (5 each)
  const sampleArtworks = {
    met: [
      { id: 'met_starry_night', title: 'Starry Night (Sample)', artist: 'Vincent van Gogh', year: 1889 },
      { id: 'met_mona_sample', title: 'Sample Portrait', artist: 'Unknown', year: 1700 },
      { id: 'met_washington', title: 'Washington Crossing', artist: 'Emanuel Leutze', year: 1851 },
      { id: 'met_socrates', title: 'The Death of Socrates', artist: 'Jacques-Louis David', year: 1787 },
      { id: 'met_armor', title: 'Field Armor', artist: 'Royal Armorers', year: 1544 }
    ],
    moma: [
      { id: 'moma_persistence', title: 'The Persistence of Memory', artist: 'Salvador Dalí', year: 1931 },
      { id: 'moma_sample_2', title: 'Modern Work A', artist: 'Artist A', year: 2001 },
      { id: 'moma_sample_3', title: 'Modern Work B', artist: 'Artist B', year: 1998 },
      { id: 'moma_sample_4', title: 'Modern Work C', artist: 'Artist C', year: 2010 },
      { id: 'moma_sample_5', title: 'Modern Work D', artist: 'Artist D', year: 2015 }
    ],
    louvre: [
      { id: 'louvre_mona_lisa_sample', title: 'Mona Lisa (Sample)', artist: 'Leonardo da Vinci', year: 1503 },
      { id: 'louvre_victory', title: 'Winged Victory (Sample)', artist: 'Unknown', year: -100 },
      { id: 'louvre_sample_3', title: 'Antique Sculpture', artist: 'Unknown', year: -200 },
      { id: 'louvre_sample_4', title: 'Masterpiece X', artist: 'Artist X', year: 1600 },
      { id: 'louvre_sample_5', title: 'Masterpiece Y', artist: 'Artist Y', year: 1700 }
    ]
  }

  let artworkCount = 0
  for (const [museumId, artworks] of Object.entries(sampleArtworks)) {
    for (const a of artworks) {
      await prisma.artwork.upsert({
        where: { id: a.id },
        update: ({
          title: a.title,
          artist: a.artist,
          year: a.year,
          qrCode: a.id
        } as any),
        create: ({
          id: a.id,
          museumId,
          title: a.title,
          artist: a.artist,
          year: a.year,
          qrCode: a.id
        } as any)
      })
      artworkCount++
    }
  }

  console.log(`✅ Created/updated ${artworkCount} artworks across ${museums.length} museums`)

  // Add a small set of curator notes for a few artworks
  const notes = [
    { artworkId: 'met_starry_night', museumId: 'met', content: 'A vivid night sky with expressive brushstrokes.', type: 'interpretation' },
    { artworkId: 'moma_persistence', museumId: 'moma', content: 'A hallmark of surrealism testing perception of time.', type: 'interpretation' },
    { artworkId: 'louvre_mona_lisa_sample', museumId: 'louvre', content: 'The half-smile continues to intrigue viewers.', type: 'historical_context' }
  ]

  let notesCreated = 0
  for (const n of notes) {
    try {
      await prisma.curatorNote.create({
        data: {
          artworkId: n.artworkId,
          museumId: n.museumId,
          curatorId: admin.id,
          content: n.content,
          type: n.type
        }
      })
      notesCreated++
    } catch (e) {
      console.log(`⚠️  Could not create note for ${n.artworkId}: ${e}`)
    }
  }

  console.log(`✅ Created ${notesCreated} curator notes`)

  console.log('\n🎉 Seed complete')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
