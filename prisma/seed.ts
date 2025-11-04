import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

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
    },
    {
      id: 'test-artwork-3',
      title: 'Girl with a Pearl Earring',
      artist: 'Johannes Vermeer',
      year: 1665,
      medium: 'Oil on canvas',
      dimensions: '44.5 cm × 39 cm (17.5 in × 15.4 in)',
      description: 'A captivating portrait of a girl wearing an exotic dress and a large pearl earring, painted with Vermeer\'s characteristic use of light.',
      curatorNotes: 'Often called the "Mona Lisa of the North," this painting demonstrates Vermeer\'s masterful technique with light and his ability to create intimate, mysterious portraits.',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/800px-1665_Girl_with_a_Pearl_Earring.jpg',
      qrCode: 'DOCENT-003',
      location: 'Gallery 1, Main Hall',
      tags: 'dutch golden age,vermeer,portrait,baroque'
    },
    {
      id: 'test-artwork-4',
      title: 'The Great Wave off Kanagawa',
      artist: 'Katsushika Hokusai',
      year: 1831,
      medium: 'Woodblock print',
      dimensions: '25.7 cm × 37.9 cm (10.1 in × 14.9 in)',
      description: 'The most famous work from Hokusai\'s series "Thirty-six Views of Mount Fuji," depicting a large wave threatening boats with Mount Fuji in the background.',
      curatorNotes: 'This iconic ukiyo-e print demonstrates the Japanese aesthetic principle of capturing the beauty of the transient world and influenced Western Impressionist artists.',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Great_Wave_off_Kanagawa.jpg/1280px-The_Great_Wave_off_Kanagawa.jpg',
      qrCode: 'DOCENT-004',
      location: 'Gallery 4, Asian Art Wing',
      tags: 'ukiyo-e,hokusai,japanese art,woodblock,mount fuji,waves'
    }
  ]

  for (const artwork of artworks) {
    await prisma.artwork.upsert({
      where: { id: artwork.id },
      update: artwork,
      create: artwork
    })
  }

  // Create test user
  const testUser = {
    id: 'test-user-1',
    email: 'test@docent.app',
    name: 'Test User',
    password: await hashPassword('testpass123')
  }

  await prisma.user.upsert({
    where: { email: testUser.email },
    update: testUser,
    create: testUser
  })

  console.log('✅ Database seeded successfully!')
  console.log(`Created ${artworks.length} artworks`)
  console.log('Test user: test@docent.app / testpass123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })