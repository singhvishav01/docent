// src/app/api/artworks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRAGInstance } from '@/lib/rag';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedMuseumId: string = searchParams.get('museum') ?? 'default';
    const artworkId = params.id;

    if (!artworkId) {
      return NextResponse.json(
        { error: 'Artwork ID is required' },
        { status: 400 }
      );
    }

    const rag = await getRAGInstance();
    
    // First try to get the artwork from the specified museum
    let artwork = await rag.getArtworkData(artworkId, requestedMuseumId);
    let actualMuseumId: string = requestedMuseumId;
    
    // If not found, try searching all museums
    if (!artwork) {
      console.log(`Artwork ${artworkId} not found in museum ${requestedMuseumId}, searching all museums`);
      artwork = await rag.getArtworkData(artworkId); // This searches all museums
      
      if (artwork) {
        // FIXED: Handle the case where artwork.museum might be undefined
        actualMuseumId = artwork.museum || 'unknown'; // Use fallback if museum is undefined
        console.log(`Found ${artworkId} in museum ${actualMuseumId} instead of ${requestedMuseumId}`);
      }
    }

    if (!artwork) {
      console.log(`Artwork ${artworkId} not found in any museum`);
      return NextResponse.json(
        { error: 'Artwork not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      artwork,
      museum: actualMuseumId, // Return the actual museum where artwork was found
      requestedMuseum: requestedMuseumId, // Also return what was requested
      context: rag.formatArtworkContext(artwork)
    });
  } catch (error) {
    console.error(`Error retrieving artwork ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}