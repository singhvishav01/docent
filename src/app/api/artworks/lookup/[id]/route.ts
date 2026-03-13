// src/app/api/artworks/lookup/[id]/route.ts
// This endpoint looks up an artwork by ID and returns which museum it belongs to

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const artworkId = params.id

    // Query ALL museums to find which one has this artwork
    // Note: Artwork IDs can exist in multiple museums (composite key)
    // We'll return the first match, or you could return all matches
    const artwork = await db.artwork.findFirst({
      where: {
        id: artworkId,
        isActive: true  // Only find active artworks
      },
      select: {
        id: true,
        museumId: true,
        title: true,
        artist: true
      }
    })

    if (!artwork) {
      return NextResponse.json(
        { error: 'Artwork not found in any museum' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: artwork.id,
      museum: artwork.museumId,
      title: artwork.title,
      artist: artwork.artist
    })

  } catch (error) {
    console.error('[Lookup API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to lookup artwork', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}