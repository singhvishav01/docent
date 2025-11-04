// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../lib/auth';
import { getRAGInstance } from '../../../lib/rag';
import { createChatCompletion, ChatContext } from '../../../lib/openai';

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

    const { message, artworkId, museumId, query } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log(`Chat request: artworkId=${artworkId}, museumId=${museumId}, message=${message.substring(0, 50)}...`);

    const rag = await getRAGInstance();
    let chunks;
    let artwork = null;
    let actualMuseumId = museumId; // Track the actual museum where artwork was found

    // FIXED: Always try to get the specific artwork first if we have both IDs
    if (artworkId) {
      console.log(`Looking for specific artwork: ${artworkId} in museum: ${museumId}`);
      
      // First try the specified museum
      if (museumId) {
        artwork = await rag.getArtworkData(artworkId, museumId);
      }
      
      // If not found, search all museums
      if (!artwork) {
        console.log(`Artwork ${artworkId} not found in museum ${museumId}, searching all museums`);
        artwork = await rag.getArtworkData(artworkId); // This searches all museums
        
        if (artwork) {
          actualMuseumId = artwork.museum; // Use the museum where it was actually found
          console.log(`Found artwork: ${artwork.title} by ${artwork.artist} in museum: ${actualMuseumId}`);
        }
      }
      
      if (artwork) {
        // Create focused search around this specific artwork using the correct museum
        chunks = await rag.semanticSearch(
          `${artwork.title} ${artwork.artist} ${message}`, 
          actualMuseumId, 
          3
        );
      } else {
        console.log(`Artwork ${artworkId} not found in any museum, falling back to general search`);
        // Fall back to general search if artwork not found
        chunks = await rag.semanticSearch(message, museumId, 4);
      }
    } else if (query && museumId) {
      // Semantic search with query
      chunks = await rag.semanticSearch(query, museumId, 5);
    } else if (message) {
      // Use the message as search query
      chunks = await rag.semanticSearch(message, museumId, 4);
    }

    const context: ChatContext = {
      messages: [{ role: 'user', content: message }],
      artworkId,
      museumId: actualMuseumId, // Use the actual museum ID where artwork was found
      query,
      chunks,
      // FIXED: Include the artwork data directly in context
      artwork
    };

    // Get response as string instead of stream for now
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
      curator_notes_count: chunks ? chunks.length : 0,
      artwork: artwork, // Return the found artwork
      actualMuseumId: actualMuseumId // Return the actual museum ID
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