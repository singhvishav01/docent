// src/app/api/museums/route.ts
import { NextResponse } from 'next/server';
import { getRAGInstance } from '@/lib/rag';

export async function GET() {
  try {
    console.log('Museums API: Loading RAG instance...');
    const rag = await getRAGInstance();
    
    console.log('Museums API: Getting museums...');
    const museums = rag.getMuseums();
    
    console.log(`Museums API: Returning ${museums.length} museums`);
    return NextResponse.json(museums);
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