import { NextRequest, NextResponse } from 'next/server';
import { getRAGInstance } from '@/lib/rag';

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

    const rag = await getRAGInstance();
    const artworks = await rag.getMuseumArtworks(museumId);

    return NextResponse.json(artworks);

  } catch (error) {
    console.error(`Error fetching artworks for museum ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch artworks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}