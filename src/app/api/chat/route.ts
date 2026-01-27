// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { createChatCompletion, ChatContext } from '../../../lib/openai';
import { ChunkedArtwork } from '../../../lib/rag/embeddings';

export async function POST(req: NextRequest) {
  try {
    // Get token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    // FOR DEVELOPMENT: Skip auth if no token (remove this in production)
    if (!token) {
      console.warn('No auth token found - proceeding without auth (DEV MODE)');
    } else {
      // Verify the token if present
      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    const { message, artworkId, museumId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log(`Chat request: artworkId=${artworkId}, museumId=${museumId}, message=${message.substring(0, 50)}...`);

    let artwork: any = null;
    let chunks: ChunkedArtwork[] = [];

    // Load artwork from database
    if (artworkId && museumId) {
      console.log(`Looking for artwork: ${artworkId} in museum: ${museumId}`);
      
      artwork = await db.artwork.findFirst({
        where: {
          id: artworkId,
          museumId: museumId
        },
        include: {
          museum: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (artwork) {
        console.log(`Found artwork: ${artwork.title} by ${artwork.artist}`);
        
        // Load curator notes for context
        const curatorNotes = await db.curatorNote.findMany({
          where: {
            artworkId: artworkId,
            museumId: museumId
          },
          include: {
            curator: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5 // Limit to most recent 5 notes
        });

        // Build context chunks from artwork and curator notes
        chunks = [
          {
            id: artwork.id,
            museumId: artwork.museumId,
            chunkId: `${artwork.id}_core`,
            content: `${artwork.title} by ${artwork.artist}${artwork.year ? ` (${artwork.year})` : ''}. ${artwork.description || ''}`,
            metadata: {
              title: artwork.title,
              artist: artwork.artist,
              year: artwork.year ?? undefined, // Convert null to undefined
              location: artwork.gallery ?? undefined,
              chunkType: 'description' as const
            }
          }
        ];

        // Add curator notes as chunks
        curatorNotes.forEach((note, idx) => {
          chunks.push({
            id: artwork.id,
            museumId: artwork.museumId,
            chunkId: `${artwork.id}_curator_${idx}`,
            content: `Curator note for ${artwork.title} (${note.type}): ${note.content}`,
            metadata: {
              title: artwork.title,
              artist: artwork.artist,
              year: artwork.year ?? undefined, // Convert null to undefined
              location: artwork.gallery ?? undefined,
              chunkType: 'curator_note' as const
            }
          });
        });

        console.log(`Built ${chunks.length} context chunks (1 core + ${curatorNotes.length} curator notes)`);
      } else {
        console.log(`Artwork ${artworkId} not found in museum ${museumId}`);
      }
    }

    // Format artwork data for OpenAI context
    const artworkData = artwork ? {
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      year: artwork.year,
      medium: artwork.medium,
      dimensions: artwork.dimensions,
      description: artwork.description,
      museum: artwork.museum.name,
      museum_name: artwork.museum.name
    } : null;

    const context: ChatContext = {
      messages: [{ role: 'user', content: message }],
      artworkId,
      museumId,
      chunks,
      artwork: artworkData
    };

    // Get response as string
    const response = await createChatCompletion(context, {
      model: 'gpt-4o-mini',
      maxTokens: 600,
      groundingTokenLimit: 1000,
      historyTokenLimit: 1500,
      stream: false
    });

    return NextResponse.json({
      response: response,
      context_used: chunks && chunks.length > 0,
      curator_notes_count: chunks ? chunks.length - 1 : 0, // Subtract 1 for core chunk
      artwork: artworkData,
      actualMuseumId: museumId
    });

  } catch (error) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage }, 
      { status: 500 }
    );
  }
}