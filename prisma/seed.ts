// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // ============================================================================
  // CREATE USERS
  // ============================================================================

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@docent.app' },
    update: {},
    create: {
      email: 'admin@docent.app',
      name: 'Admin User',
      role: 'admin',
      password: await hashPassword('admin123')
    }
  })
  console.log('✅ Admin user created: admin@docent.app / admin123')

  // Curator user
  await prisma.user.upsert({
    where: { email: 'curator@docent.app' },
    update: {},
    create: {
      email: 'curator@docent.app',
      name: 'Test Curator',
      role: 'curator',
      password: await hashPassword('curator123')
    }
  })
  console.log('✅ Curator user created: curator@docent.app / curator123')

  // Visitor user
  await prisma.user.upsert({
    where: { email: 'test@docent.app' },
    update: {},
    create: {
      email: 'test@docent.app',
      name: 'Test User',
      role: 'visitor',
      password: await hashPassword('testpass123')
    }
  })
  console.log('✅ Test user created: test@docent.app / testpass123')

  // ============================================================================
  // CREATE TEST MUSEUM (Optional - for testing seed)
  // ============================================================================

  const testMuseum = await prisma.museum.upsert({
    where: { id: 'test-museum' },
    update: {},
    create: {
      id: 'test-museum',
      name: 'Test Museum',
      description: 'A test museum created during database seeding',
      location: 'Development Environment'
    }
  })
  console.log('✅ Test museum created: test-museum')

  // ============================================================================
  // CREATE TEST ARTWORKS (Optional - for testing seed)
  // ============================================================================

  const testArtworks = [
    {
      museumId: 'test-museum',
      id: 'test-artwork-1',
      title: 'The Starry Night',
      artist: 'Vincent van Gogh',
      year: 1889,
      medium: 'Oil on canvas',
      dimensions: '73.7 cm × 92.1 cm (29 in × 36¼ in)',
      description: 'A swirling, dreamlike depiction of the night sky over a sleeping village, painted during van Gogh\'s stay at the Saint-Paul-de-Mausole asylum in Saint-Rémy-de-Provence.',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      qrCode: 'DOCENT-001',
      gallery: 'Gallery 2, East Wing',
      tags: 'post-impressionism,van gogh,night scene,masterpiece'
    },
    {
      museumId: 'test-museum',
      id: 'test-artwork-2',
      title: 'The Persistence of Memory',
      artist: 'Salvador Dalí',
      year: 1931,
      medium: 'Oil on canvas',
      dimensions: '24 cm × 33 cm (9.5 in × 13 in)',
      description: 'A surrealist painting featuring melting clocks in a dreamlike landscape, exploring themes of time, memory, and the subconscious mind.',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      qrCode: 'DOCENT-002',
      gallery: 'Gallery 3, West Wing',
      tags: 'surrealism,dali,time,dreams,melting clocks'
    }
  ]

  for (const artwork of testArtworks) {
    await prisma.artwork.upsert({
      where: {
        museumId_id: {
          museumId: artwork.museumId,
          id: artwork.id
        }
      },
      update: artwork,
      create: artwork
    })
    console.log(`✅ Created test artwork: ${artwork.title}`)
  }

  console.log('\n🎉 Database seeded successfully!')
  console.log('\n📋 Test Accounts:')
  console.log('   Admin:   admin@docent.app / admin123')
  console.log('   Curator: curator@docent.app / curator123')
  console.log('   Visitor: test@docent.app / testpass123')
  console.log('\n💡 Note: Run "npm run import-json" to import museum data from JSON files')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })