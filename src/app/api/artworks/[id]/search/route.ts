import { NextRequest, NextResponse } from 'next/server';
import { getRAGInstance } from '@/lib/rag';

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

    const rag = await getRAGInstance();
    const results = await rag.searchArtworks(query, museumId || undefined);

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