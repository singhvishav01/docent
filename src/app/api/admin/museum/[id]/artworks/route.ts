// src/app/api/admin/museum/[id]/artworks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const museumId = params.id;
    
    if (!museumId) {
      return NextResponse.json(
        { error: 'Museum ID is required' },
        { status: 400 }
      );
    }

    console.log(`Loading artworks for museum: ${museumId}`);

    // Load artworks from database
    const artworks = await db.artwork.findMany({
      where: {
        museumId: museumId,
        isActive: true
      },
      orderBy: {
        title: 'asc'
      }
    });

    // Get curator notes count for each artwork
    const artworksWithCounts = await Promise.all(
      artworks.map(async (artwork) => {
        const notesCount = await db.curatorNote.count({
          where: {
            artworkId: artwork.id,
            museumId: artwork.museumId
          }
        });

        return {
          id: artwork.id,
          title: artwork.title,
          artist: artwork.artist,
          year: artwork.year,
          medium: artwork.medium,
          dimensions: artwork.dimensions,
          description: artwork.description,
          image_url: artwork.imageUrl,
          gallery: artwork.gallery,
          accession_number: artwork.accessionNumber,
          period: artwork.period,
          museum: museumId,
          curator_notes: Array(notesCount).fill({ note: '' }) // Placeholder array for count
        };
      })
    );

    console.log(`Found ${artworksWithCounts.length} artworks for museum ${museumId}`);

    return NextResponse.json(artworksWithCounts);

  } catch (error) {
    console.error(`Error fetching artworks for museum ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch artworks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}