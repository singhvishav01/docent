// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../lib/auth';
import { createChatCompletion, ChatContext } from '../../../lib/ai/openai';
import { ChunkedArtwork } from '../../../lib/rag/embeddings';
import { getArtworkContext } from '../../../lib/artwork-cache';

export async function POST(req: NextRequest) {
  try {
    // Get token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (token) {
      // Verify the token if present
      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    const {
      message,
      artworkId,
      museumId,
      visitorName = null,
      docentName = null,
      stream: useStream = false,
      conversationHistory = [],
      conversationSummary = '',
      voice = false,
      visitorProfile = null,
    } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let artwork: any = null;
    let chunks: ChunkedArtwork[] = [];

    if (artworkId && museumId) {
      const cached = await getArtworkContext(artworkId, museumId);

      if (cached) {
        artwork = cached.artwork;

        chunks = [
          {
            id: artwork.id,
            museumId: artwork.museumId,
            chunkId: `${artwork.id}_core`,
            content: `${artwork.title} by ${artwork.artist}${artwork.year ? ` (${artwork.year})` : ''}. ${artwork.description || ''}`,
            metadata: {
              title: artwork.title,
              artist: artwork.artist,
              year: artwork.year ?? undefined,
              location: artwork.gallery ?? undefined,
              chunkType: 'description' as const,
            },
          },
        ];

        cached.curatorNotes.forEach((note, idx) => {
          chunks.push({
            id: artwork.id,
            museumId: artwork.museumId,
            chunkId: `${artwork.id}_curator_${idx}`,
            content: `Curator note for ${artwork.title} (${note.type}): ${note.content}`,
            metadata: {
              title: artwork.title,
              artist: artwork.artist,
              year: artwork.year ?? undefined,
              location: artwork.gallery ?? undefined,
              chunkType: 'curator_note' as const,
            },
          });
        });
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

    // Prepend conversation history so the AI understands short replies like "yep" or "go on"
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...conversationHistory.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const context: ChatContext = {
      messages,
      artworkId,
      museumId,
      chunks,
      artwork: artworkData,
      visitorName: visitorName || undefined,
      docentName: docentName || undefined,
      visitorProfile: visitorProfile || undefined,
      conversationSummary: conversationSummary || undefined,
    };

    if (useStream) {
      // Streaming path — pipes raw text deltas directly to the client
      const streamResult = await createChatCompletion(context, {
        model: 'gpt-4o-mini',
        maxTokens: 500,
        groundingTokenLimit: 1000,
        historyTokenLimit: 1500,
        stream: true,
        voice: voice,
      }) as ReadableStream;

      return new Response(streamResult, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Non-streaming path (text mode) — returns full JSON response
    const response = await createChatCompletion(context, {
      model: 'gpt-4o-mini',
      maxTokens: 600,
      groundingTokenLimit: 1000,
      historyTokenLimit: 1500,
      stream: false,
      voice: voice,
    });

    return NextResponse.json({
      response: response,
      context_used: chunks && chunks.length > 0,
      curator_notes_count: chunks ? chunks.length - 1 : 0,
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