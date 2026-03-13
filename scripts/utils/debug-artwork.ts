// Quick debug script - you can run this to see what artwork IDs exist
// Run with: npx ts-node scripts/debug-artworks.ts

import { db } from '@/lib/db'

async function debugArtworks() {
  console.log('Fetching all artworks from database...\n')
  
  const artworks = await db.artwork.findMany({
    select: {
      id: true,
      museumId: true,
      title: true,
      artist: true
    },
    take: 20  // Just show first 20
  })

  console.log(`Found ${artworks.length} artworks:\n`)
  
  artworks.forEach(artwork => {
    console.log(`ID: "${artwork.id}"`)
    console.log(`Museum: ${artwork.museumId}`)
    console.log(`Title: ${artwork.title}`)
    console.log(`Artist: ${artwork.artist}`)
    console.log('---')
  })

  // Test the specific IDs you're trying to scan
  console.log('\nTesting specific IDs from your error logs:')
  
  const testIds = ['the_coronation_of_napoleon', 'liberty_leading_people']
  
  for (const testId of testIds) {
    const result = await db.artwork.findFirst({
      where: { id: testId }
    })
    console.log(`\n"${testId}": ${result ? `FOUND in ${result.museumId}` : 'NOT FOUND'}`)
  }
  
  // Search for similar names
  console.log('\n\nSearching for artworks with "coronation" in title:')
  const coronation = await db.artwork.findMany({
    where: {
      title: {
        contains: 'coronation',
        mode: 'insensitive'
      }
    },
    select: { id: true, title: true, museumId: true }
  })
  console.log(coronation)

  console.log('\n\nSearching for artworks with "liberty" in title:')
  const liberty = await db.artwork.findMany({
    where: {
      title: {
        contains: 'liberty',
        mode: 'insensitive'
      }
    },
    select: { id: true, title: true, museumId: true }
  })
  console.log(liberty)
}

debugArtworks()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch(console.error)