// src/app/api/museums/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    console.log('Museums API: Loading from database...');
    
    const museums = await db.museum.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        _count: {
          select: {
            artworks: true
          }
        }
      }
    });
    
    console.log(`Museums API: Found ${museums.length} museums`);
    
    // Format response to match the expected Museum type
    const formattedMuseums = museums.map(museum => ({
      id: museum.id,
      name: museum.name,
      description: museum.description,
      location: museum.location,
      artworkCount: museum._count.artworks
    }));
    
    return NextResponse.json(formattedMuseums);
  } catch (error) {
    console.error('Museums API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to load museums', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}