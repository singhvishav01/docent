// src/lib/openai.ts - Update the ChatContext interface
import OpenAI from 'openai';
import { ChunkedArtwork } from './rag/embeddings';
import { ArtworkData } from './rag/types';

export interface ChatContext {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  artworkId?: string;
  museumId?: string;
  query?: string;
  chunks?: ChunkedArtwork[];
  artwork?: ArtworkData | null; // Added artwork property with proper type
}

export interface CompactGroundingContext {
  relevantChunks: string[];
  artworkTitles: string[];
  totalTokensEstimate: number;
}

// Estimate tokens (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Build minimal grounding context from chunks
export function buildCompactGroundingContext(
  chunks: ChunkedArtwork[],
  maxTokens: number = 1000
): CompactGroundingContext {
  const relevantChunks: string[] = [];
  const artworkTitles = new Set<string>();
  let currentTokens = 0;

  // Prioritize chunks by importance
  const chunkPriority = {
    'description': 0,
    'technical_details': 1,
    'curator_note': 2,
    'provenance': 3
  };

  const sortedChunks = chunks.sort((a, b) => {
    const priorityA = chunkPriority[a.metadata.chunkType] ?? 99;
    const priorityB = chunkPriority[b.metadata.chunkType] ?? 99;
    return priorityA - priorityB;
  });

  for (const chunk of sortedChunks) {
    const chunkTokens = estimateTokens(chunk.content);
    
    if (currentTokens + chunkTokens > maxTokens) {
      break;
    }

    // Format chunk with metadata
    const formattedChunk = `[${chunk.metadata.chunkType.toUpperCase()}] ${chunk.content}`;
    relevantChunks.push(formattedChunk);
    artworkTitles.add(chunk.metadata.title);
    currentTokens += chunkTokens;
  }

  return {
    relevantChunks,
    artworkTitles: Array.from(artworkTitles),
    totalTokensEstimate: currentTokens
  };
}

// Trim chat history to fit context window
export function trimChatHistory(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens: number = 2000
): Array<{ role: 'user' | 'assistant'; content: string }> {
  let totalTokens = 0;
  const trimmedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Always keep the most recent message
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = estimateTokens(message.content);
    
    if (totalTokens + messageTokens > maxTokens && trimmedMessages.length > 0) {
      break;
    }
    
    trimmedMessages.unshift(message);
    totalTokens += messageTokens;
  }

  return trimmedMessages;
}

export function buildSystemPrompt(context: CompactGroundingContext, artwork?: ArtworkData | null): string {
  const artworksList = context.artworkTitles.length > 0 
    ? `Available artworks: ${context.artworkTitles.join(', ')}`
    : '';

  // Add specific artwork context if available
  let artworkContext = '';
  if (artwork) {
    artworkContext = `

CURRENT ARTWORK CONTEXT:
Title: ${artwork.title}
Artist: ${artwork.artist}
${artwork.year ? `Year: ${artwork.year}` : ''}
${artwork.medium ? `Medium: ${artwork.medium}` : ''}
${artwork.description ? `Description: ${artwork.description}` : ''}
Museum: ${artwork.museum_name || artwork.museum}`;
  }

  return `You are a knowledgeable museum guide assistant. Help visitors understand and appreciate the artworks they're viewing.

${artworksList}${artworkContext}

RELEVANT INFORMATION:
${context.relevantChunks.join('\n\n')}

INSTRUCTIONS:
- Provide engaging, educational responses about the artworks
- Use the provided information as your primary source
- Focus on the current artwork context when available
- If asked about artworks not in the provided information, politely explain you don't have details about those specific pieces
- Keep responses conversational but informative
- Encourage deeper engagement with the artworks
- If technical details aren't provided, focus on visual elements and artistic significance

Respond naturally and helpfully to the visitor's questions.`;
}

// Modified to support both streaming and non-streaming responses
export async function createChatCompletion(
  context: ChatContext,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    groundingTokenLimit?: number;
    historyTokenLimit?: number;
    stream?: boolean; // Added stream option
  } = {}
): Promise<ReadableStream | string> {
  const {
    model = 'gpt-4o-mini',
    maxTokens = 800,
    temperature = 0.7,
    groundingTokenLimit = 1200,
    historyTokenLimit = 2000,
    stream = true // Default to streaming
  } = options;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  });

  try {
    // Build compact grounding context
    const groundingContext = context.chunks 
      ? buildCompactGroundingContext(context.chunks, groundingTokenLimit)
      : { relevantChunks: [], artworkTitles: [], totalTokensEstimate: 0 };

    // Trim chat history
    const trimmedHistory = trimChatHistory(context.messages, historyTokenLimit);

    // Build system prompt with artwork context
    const systemPrompt = buildSystemPrompt(groundingContext, context.artwork);

    console.log(`Token usage estimate - System: ${estimateTokens(systemPrompt)}, History: ${estimateTokens(JSON.stringify(trimmedHistory))}, Grounding: ${groundingContext.totalTokensEstimate}`);

    if (stream) {
      // Streaming response
      const streamResponse = await openai.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmedHistory
        ]
      });

      // Convert OpenAI stream to ReadableStream
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResponse) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(new TextEncoder().encode(content));
              }
            }
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        }
      });

      return readableStream;
    } else {
      // Non-streaming response
      const response = await openai.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmedHistory
        ]
      });

      return response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    }

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Fallback response
    const fallbackResponse = "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try asking your question again in a moment.";
    
    if (stream) {
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(fallbackResponse));
          controller.close();
        }
      });
    } else {
      return fallbackResponse;
    }
  }
}