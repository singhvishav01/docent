// src/app/api/artworks/[id]/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const museumId = searchParams.get('museum');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log(`Searching artworks: query="${query}", museum=${museumId || 'all'}`);

    // Search in database
    const artworks = await db.artwork.findMany({
      where: {
        AND: [
          museumId ? { museumId } : {},
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { artist: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      },
      include: {
        museum: {
          select: {
            name: true
          }
        }
      },
      take: 10
    });

    const results = artworks.map(artwork => ({
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      year: artwork.year,
      museum: artwork.museumId,
      museum_name: artwork.museum.name
    }));

    console.log(`Found ${results.length} results`);

    return NextResponse.json({
      query,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}