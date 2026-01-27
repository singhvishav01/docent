// src/app/api/artworks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedMuseumId: string = searchParams.get('museum') ?? 'met';
    const artworkId = params.id;

    if (!artworkId) {
      return NextResponse.json(
        { error: 'Artwork ID is required' },
        { status: 400 }
      );
    }

    console.log(`Loading artwork: ${artworkId} from museum: ${requestedMuseumId}`);

    // Load artwork from database with curator notes
    const artwork = await db.artwork.findFirst({
      where: {
        id: artworkId,
        museumId: requestedMuseumId
      },
      include: {
        museum: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      }
    });

    if (!artwork) {
      console.log(`Artwork ${artworkId} not found in museum ${requestedMuseumId}`);
      return NextResponse.json(
        { error: 'Artwork not found' },
        { status: 404 }
      );
    }

    // Load curator notes separately
    const curatorNotes = await db.curatorNote.findMany({
      where: {
        artworkId: artworkId,
        museumId: requestedMuseumId
      },
      include: {
        curator: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the response
    const formattedArtwork = {
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
      museum: requestedMuseumId,
      museum_name: artwork.museum.name,
      curator_notes: curatorNotes.map(note => ({
        note: note.content,
        author: note.curator.name || note.curator.email,
        date: note.createdAt.toISOString(),
        type: note.type
      }))
    };

    console.log(`Found artwork with ${curatorNotes.length} curator notes`);

    return NextResponse.json({
      artwork: formattedArtwork,
      museum: requestedMuseumId,
      requestedMuseum: requestedMuseumId
    });

  } catch (error) {
    console.error(`Error retrieving artwork ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}