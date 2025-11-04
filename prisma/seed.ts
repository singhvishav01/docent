// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminUser = {
    id: 'admin-user-1',
    email: 'admin@docent.app',
    name: 'Admin User',
    role: 'admin',
    password: await hashPassword('admin123') // CHANGE THIS IN PRODUCTION!
  }

  await prisma.user.upsert({
    where: { email: adminUser.email },
    update: adminUser,
    create: adminUser
  })
  console.log('✅ Admin user created: admin@docent.app / admin123')

  // Create curator user
  const curatorUser = {
    id: 'curator-user-1',
    email: 'curator@docent.app',
    name: 'Test Curator',
    role: 'curator',
    password: await hashPassword('curator123')
  }

  await prisma.user.upsert({
    where: { email: curatorUser.email },
    update: curatorUser,
    create: curatorUser
  })
  console.log('✅ Curator user created: curator@docent.app / curator123')

  // Create regular visitor user
  const testUser = {
    id: 'test-user-1',
    email: 'test@docent.app',
    name: 'Test User',
    role: 'visitor',
    password: await hashPassword('testpass123')
  }

  await prisma.user.upsert({
    where: { email: testUser.email },
    update: testUser,
    create: testUser
  })
  console.log('✅ Test user created: test@docent.app / testpass123')

  // Create test artworks
  const artworks = [
    {
      id: 'test-artwork-1',
      title: 'The Starry Night',
      artist: 'Vincent van Gogh',
      year: 1889,
      medium: 'Oil on canvas',
      dimensions: '73.7 cm × 92.1 cm (29 in × 36¼ in)',
      description: 'A swirling, dreamlike depiction of the night sky over a sleeping village, painted during van Gogh\'s stay at the Saint-Paul-de-Mausole asylum in Saint-Rémy-de-Provence.',
      curatorNotes: 'This masterpiece showcases van Gogh\'s unique Post-Impressionist style, with bold colors and dramatic brushstrokes that convey emotion and movement.',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      qrCode: 'DOCENT-001',
      location: 'Gallery 2, East Wing',
      tags: 'post-impressionism,van gogh,night scene,masterpiece'
    },
    {
      id: 'test-artwork-2',
      title: 'The Persistence of Memory',
      artist: 'Salvador Dalí',
      year: 1931,
      medium: 'Oil on canvas',
      dimensions: '24 cm × 33 cm (9.5 in × 13 in)',
      description: 'A surrealist painting featuring melting clocks in a dreamlike landscape, exploring themes of time, memory, and the subconscious mind.',
      curatorNotes: 'Dalí\'s most famous work demonstrates his "paranoiac-critical method" of accessing the subconscious to create art that challenges our perception of reality.',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      qrCode: 'DOCENT-002',
      location: 'Gallery 3, West Wing',
      tags: 'surrealism,dali,time,dreams,melting clocks'
    }
  ]

  for (const artwork of artworks) {
    await prisma.artwork.upsert({
      where: { id: artwork.id },
      update: artwork,
      create: artwork
    })
  }
  console.log(`✅ Created ${artworks.length} artworks`)

  console.log('\n🎉 Database seeded successfully!')
  console.log('\n📋 Test Accounts:')
  console.log('   Admin:   admin@docent.app / admin123')
  console.log('   Curator: curator@docent.app / curator123')
  console.log('   Visitor: test@docent.app / testpass123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })