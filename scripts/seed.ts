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

  // All images are public domain from Wikimedia Commons or Met Open Access.
  // Wikimedia Commons: https://commons.wikimedia.org (free, public domain)
  // Met Open Access: https://www.metmuseum.org/about-the-met/policies-and-documents/open-access
  const sampleArtworks: Record<string, Array<{
    id: string; title: string; artist: string; year: number;
    medium?: string; description?: string; imageUrl?: string;
  }>> = {
    met: [
      {
        id: 'met_starry_night',
        title: 'The Starry Night',
        artist: 'Vincent van Gogh',
        year: 1889,
        medium: 'Oil on canvas',
        description: 'A swirling night sky over a village, painted during Van Gogh\'s stay at the Saint-Paul-de-Mausole asylum. The cypress tree in the foreground reaches toward a turbulent sky filled with spiraling stars and a crescent moon.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'
      },
      {
        id: 'met_mona_sample',
        title: 'Aristotle with a Bust of Homer',
        artist: 'Rembrandt van Rijn',
        year: 1653,
        medium: 'Oil on canvas',
        description: 'Rembrandt depicts the Greek philosopher Aristotle contemplating a bust of Homer. Aristotle rests his hand on the bust while wearing a gold medallion bearing the image of his pupil Alexander the Great. The work explores the chain connecting classical wisdom across generations.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Rembrandt_-_Aristotle_with_a_Bust_of_Homer_-_WGA19258.jpg/895px-Rembrandt_-_Aristotle_with_a_Bust_of_Homer_-_WGA19258.jpg'
      },
      {
        id: 'met_washington',
        title: 'Washington Crossing the Delaware',
        artist: 'Emanuel Leutze',
        year: 1851,
        medium: 'Oil on canvas',
        description: 'One of the most iconic images in American history, depicting George Washington\'s daring crossing of the icy Delaware River on Christmas night, 1776. The dramatic composition places Washington at the center, standing resolute in the bow of a wooden boat pushing through ice floes.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Washington_Crossing_the_Delaware_by_Emanuel_Leutze%2C_MMA-NYC%2C_1851.jpg/1280px-Washington_Crossing_the_Delaware_by_Emanuel_Leutze%2C_MMA-NYC%2C_1851.jpg'
      },
      {
        id: 'met_socrates',
        title: 'The Death of Socrates',
        artist: 'Jacques-Louis David',
        year: 1787,
        medium: 'Oil on canvas',
        description: 'David depicts the final moments of the philosopher Socrates, condemned to death by the Athenian state. Calm and undeterred, Socrates reaches for the cup of hemlock while continuing to lecture his grief-stricken disciples on the immortality of the soul.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/David_-_The_Death_of_Socrates.jpg/1280px-David_-_The_Death_of_Socrates.jpg'
      },
      {
        id: 'met_armor',
        title: 'Parade Armor of Henry II of France',
        artist: 'Royal French Armorer',
        year: 1555,
        medium: 'Steel, gold, silver',
        description: 'This spectacular armor was created for French King Henry II, likely for ceremonial display rather than actual combat. Every surface is covered in intricate etched and gilded decoration depicting classical mythology and military trophies, showcasing the pinnacle of Renaissance metalwork.',
        imageUrl: 'https://images.metmuseum.org/CRDImages/aa/original/DT251139.jpg'
      }
    ],
    moma: [
      {
        id: 'moma_persistence',
        title: 'Starry Night Over the Rhône',
        artist: 'Vincent van Gogh',
        year: 1888,
        medium: 'Oil on canvas',
        description: 'Painted from the banks of the Rhône in Arles, this nocturnal scene captures the gas-lit reflections shimmering on the water. Van Gogh wrote to his brother Theo about his desire to paint a starry night, describing the deep blue sky and the glowing reflections as intensely emotional.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Starry_Night_Over_the_Rh%C3%B4ne.jpg/1280px-Starry_Night_Over_the_Rh%C3%B4ne.jpg'
      },
      {
        id: 'moma_sample_2',
        title: 'Broadway Boogie-Woogie',
        artist: 'Piet Mondrian',
        year: 1943,
        medium: 'Oil on canvas',
        description: 'Mondrian created this work after fleeing Europe for New York City in 1940. The grid of yellow, red, and blue squares captures the energy of Manhattan\'s street grid and the syncopated rhythms of boogie-woogie jazz, which Mondrian loved to dance to. It represents a joyful departure from his severe earlier work.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Piet_Mondriaan%2C_1942_-_Broadway_Boogie-Woogie.jpg/1024px-Piet_Mondriaan%2C_1942_-_Broadway_Boogie-Woogie.jpg'
      },
      {
        id: 'moma_sample_3',
        title: 'The Great Wave off Kanagawa',
        artist: 'Katsushika Hokusai',
        year: 1831,
        medium: 'Woodblock print',
        description: 'Perhaps the most recognized image in Japanese art, this woodblock print depicts a towering wave threatening boats near Mount Fuji. Hokusai was in his early seventies when he created this work, part of his "Thirty-six Views of Mount Fuji" series. The wave\'s claw-like foam and the serene mountain in the background create a tension between chaos and permanence.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg'
      },
      {
        id: 'moma_sample_4',
        title: 'A Sunday Afternoon on the Island of La Grande Jatte',
        artist: 'Georges Seurat',
        year: 1886,
        medium: 'Oil on canvas',
        description: 'Seurat spent two years on this monumental work, meticulously applying millions of tiny dots of pure color — a technique he called Pointillism, or Chromoluminarism. The scene shows Parisians relaxing on an island in the Seine. Seurat\'s scientific approach to color theory turned a casual afternoon into a timeless, almost dreamlike tableau.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg/1280px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg'
      },
      {
        id: 'moma_sample_5',
        title: 'Dance at Le Moulin de la Galette',
        artist: 'Pierre-Auguste Renoir',
        year: 1876,
        medium: 'Oil on canvas',
        description: 'Renoir captured the joy of an outdoor dance on a Sunday afternoon at a popular Montmartre dance hall. Painted entirely on-site over several months, the dappled sunlight filtering through the trees onto the dancing figures is considered one of the crowning achievements of Impressionism.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Auguste_Renoir_-_Dance_at_Le_Moulin_de_la_Galette_-_Mus%C3%A9e_d%27Orsay_RF_2739_%281876%29.jpg/1280px-Auguste_Renoir_-_Dance_at_Le_Moulin_de_la_Galette_-_Mus%C3%A9e_d%27Orsay_RF_2739_%281876%29.jpg'
      }
    ],
    louvre: [
      {
        id: 'louvre_mona_lisa_sample',
        title: 'Mona Lisa',
        artist: 'Leonardo da Vinci',
        year: 1503,
        medium: 'Oil on poplar panel',
        description: 'The most visited, most written about, most sung about, and most parodied work of art in the world. Leonardo worked on this portrait — believed to depict Lisa Gherardini, wife of a Florentine merchant — for four years. Her expression shifts between a smile and neutrality depending on where you focus, a phenomenon tied to how peripheral vision processes contrast.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg'
      },
      {
        id: 'louvre_victory',
        title: 'Winged Victory of Samothrace',
        artist: 'Unknown (Hellenistic)',
        year: -190,
        medium: 'Parian marble',
        description: 'Created around 190 BC to commemorate a naval victory, this masterpiece of Hellenistic sculpture depicts the goddess Nike alighting on the prow of a warship. Despite lacking a head and arms, the work conveys extraordinary forward momentum — the drapery pressed against the body as if by wind, the wings spread in triumphant flight.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Nike_of_Samothrake_Louvre_Ma2369_n4.jpg/800px-Nike_of_Samothrake_Louvre_Ma2369_n4.jpg'
      },
      {
        id: 'louvre_sample_3',
        title: 'Venus de Milo',
        artist: 'Unknown (Ancient Greek)',
        year: -100,
        medium: 'Marble',
        description: 'Discovered on the island of Milos in 1820, this statue is widely regarded as the ideal of feminine beauty. Believed to depict Aphrodite, goddess of love, the work dates to around 100 BC. The identity of the original sculptor and the original position of the missing arms remain one of art history\'s enduring mysteries.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Venus_de_Milo_Louvre_Ma399_n3.jpg/800px-Venus_de_Milo_Louvre_Ma399_n3.jpg'
      },
      {
        id: 'louvre_sample_4',
        title: 'The Lacemaker',
        artist: 'Johannes Vermeer',
        year: 1669,
        medium: 'Oil on canvas',
        description: 'One of Vermeer\'s smallest works, this intimate painting shows a young woman concentrating on her lacework. The yellow and white threads in the foreground are rendered with extraordinary softness — almost blurred — as if seen through the lens of an optical device. Many scholars believe Vermeer used a camera obscura to achieve the optical effects in his paintings.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Jan_Vermeer_-_The_Lacemaker_%28c._1669-1671%29.jpg/585px-Jan_Vermeer_-_The_Lacemaker_%28c._1669-1671%29.jpg'
      },
      {
        id: 'louvre_sample_5',
        title: 'The Pilgrimage to Cythera',
        artist: 'Antoine Watteau',
        year: 1717,
        medium: 'Oil on canvas',
        description: 'Watteau invented an entirely new genre of painting with this work — the fête galante, depicting elegantly dressed figures in an outdoor idyllic setting. The painting shows couples departing (or arriving at) the mythical island of Cythera, sacred to Venus. The bittersweet mood — joy tinged with the sadness of parting — made Watteau one of the most emotionally complex painters of the 18th century.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/L%27Embarquement_pour_Cyth%C3%A8re%2C_by_Antoine_Watteau%2C_from_C2RMF_retouched.jpg/1280px-L%27Embarquement_pour_Cyth%C3%A8re%2C_by_Antoine_Watteau%2C_from_C2RMF_retouched.jpg'
      }
    ]
  }

  let artworkCount = 0
  for (const [museumId, artworks] of Object.entries(sampleArtworks)) {
    for (const a of artworks) {
      await prisma.artwork.upsert({
        where: { qrCode: a.id },
        update: ({
          title: a.title,
          artist: a.artist,
          year: a.year,
          medium: a.medium,
          description: a.description,
          imageUrl: a.imageUrl,
          qrCode: a.id
        } as any),
        create: ({
          id: a.id,
          museumId,
          title: a.title,
          artist: a.artist,
          year: a.year,
          medium: a.medium,
          description: a.description,
          imageUrl: a.imageUrl,
          qrCode: a.id
        } as any)
      })
      artworkCount++
    }
  }

  console.log(`✅ Created/updated ${artworkCount} artworks across ${museums.length} museums`)

  // Add curator notes for a few artworks
  const notes = [
    { artworkId: 'met_starry_night', museumId: 'met', content: 'The swirling sky and thick impasto technique reveal Van Gogh\'s intense emotional state during his voluntary confinement. The village below is based on Saint-Rémy-de-Provence but the church steeple resembles those of his native Holland — a subtle act of homesickness.', type: 'interpretation' },
    { artworkId: 'moma_persistence', museumId: 'moma', content: 'Van Gogh wrote to his brother Theo about this painting in a letter dated September 29, 1888: "I have a new study of a starry sky... the Rhône, with the Great Bear, a sparkling of pink and green on the cobalt-blue field of the night sky."', type: 'historical_context' },
    { artworkId: 'louvre_mona_lisa_sample', museumId: 'louvre', content: 'The sfumato technique — a soft, smoky blending of tones with no hard outlines — was developed and perfected by Leonardo. The background landscape on the left and right sides are at different heights, suggesting the viewpoint has shifted, creating a subtle disorientation that contributes to the painting\'s uncanny quality.', type: 'interpretation' },
    { artworkId: 'met_socrates', museumId: 'met', content: 'David painted this work in the years leading up to the French Revolution. The Stoic calm of Socrates facing death was an unmistakable political statement — a call for civic virtue and sacrifice that would resonate deeply with revolutionary audiences.', type: 'historical_context' },
    { artworkId: 'louvre_sample_4', museumId: 'louvre', content: 'Vermeer likely owned a camera obscura, which projects an upside-down image of a scene through a lens onto a surface. The distinctive out-of-focus quality of the threads in the foreground closely matches what a camera lens produces — something the human eye does not naturally see.', type: 'technical' }
  ]

  let notesCreated = 0
  for (const n of notes) {
    try {
      // Check if note already exists to avoid duplicates
      const existing = await prisma.curatorNote.findFirst({
        where: { artworkId: n.artworkId, museumId: n.museumId, content: n.content }
      })
      if (!existing) {
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
      }
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
