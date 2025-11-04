import { NextRequest, NextResponse } from 'next/server';
import { getRAGInstance } from '@/lib/rag';
import { ArtworkData } from '@/lib/rag/types';

export async function POST(request: NextRequest) {
  try {
    const { artwork, museumId }: { artwork: ArtworkData; museumId: string } = await request.json();
    
    if (!artwork || !museumId) {
      return NextResponse.json(
        { error: 'Artwork data and museum ID are required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!artwork.id || !artwork.title || !artwork.artist) {
      return NextResponse.json(
        { error: 'ID, title, and artist are required fields' },
        { status: 400 }
      );
    }

    const rag = await getRAGInstance();
    
    // Check if artwork already exists
    const existingArtwork = await rag.getArtworkData(artwork.id, museumId);
    if (existingArtwork) {
      return NextResponse.json(
        { error: 'An artwork with this ID already exists in this museum' },
        { status: 409 }
      );
    }

    // Save the artwork
    await rag.saveArtworkData(artwork, museumId);

    return NextResponse.json({ 
      message: 'Artwork created successfully',
      artwork: { ...artwork, museum: museumId }
    });

  } catch (error) {
    console.error('Create artwork error:', error);
    return NextResponse.json(
      { error: 'Failed to create artwork', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { artwork, museumId }: { artwork: ArtworkData; museumId: string } = await request.json();
    
    if (!artwork || !museumId) {
      return NextResponse.json(
        { error: 'Artwork data and museum ID are required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!artwork.id || !artwork.title || !artwork.artist) {
      return NextResponse.json(
        { error: 'ID, title, and artist are required fields' },
        { status: 400 }
      );
    }

    const rag = await getRAGInstance();
    
    // Check if artwork exists
    const existingArtwork = await rag.getArtworkData(artwork.id, museumId);
    if (!existingArtwork) {
      return NextResponse.json(
        { error: 'Artwork not found' },
        { status: 404 }
      );
    }

    // Update the artwork
    await rag.saveArtworkData(artwork, museumId);

    return NextResponse.json({ 
      message: 'Artwork updated successfully',
      artwork: { ...artwork, museum: museumId }
    });

  } catch (error) {
    console.error('Update artwork error:', error);
    return NextResponse.json(
      { error: 'Failed to update artwork', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}