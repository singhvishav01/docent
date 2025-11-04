// src/lib/rag/embeddings.ts
import OpenAI from 'openai';
import { ArtworkData, Museum } from './types';

export interface ChunkedArtwork {
  id: string;
  museumId: string;
  chunkId: string;
  content: string;
  metadata: {
    title: string;
    artist: string;
    year?: number;
    location?: string;
    chunkType: 'description' | 'provenance' | 'technical_details' | 'curator_note';
  };
  embedding?: number[];
}

export class EmbeddingsService {
  private openai: OpenAI;
  private chunks: Map<string, ChunkedArtwork[]> = new Map(); // museumId -> chunks
  private embeddings: Map<string, number[]> = new Map(); // chunkId -> embedding

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  // Chunk artwork data intelligently
  chunkArtwork(artwork: ArtworkData, museumId: string): ChunkedArtwork[] {
    const chunks: ChunkedArtwork[] = [];
    
    // Core info chunk (always include this)
    chunks.push({
      id: artwork.id,
      museumId,
      chunkId: `${artwork.id}_core`,
      content: `${artwork.title} by ${artwork.artist}${artwork.year ? ` (${artwork.year})` : ''}. ${artwork.description?.substring(0, 200) || ''}`,
      metadata: {
        title: artwork.title,
        artist: artwork.artist,
        year: artwork.year,
        location: artwork.location,
        chunkType: 'description'
      }
    });

    // Description chunks (split long descriptions)
    if (artwork.description && artwork.description.length > 300) {
      const descChunks = this.splitText(artwork.description, 400);
      descChunks.forEach((chunk, idx) => {
        chunks.push({
          id: artwork.id,
          museumId,
          chunkId: `${artwork.id}_desc_${idx}`,
          content: `${artwork.title}: ${chunk}`,
          metadata: {
            title: artwork.title,
            artist: artwork.artist,
            year: artwork.year,
            location: artwork.location,
            chunkType: 'description'
          }
        });
      });
    }

    // Provenance chunk
    if (artwork.provenance) {
      chunks.push({
        id: artwork.id,
        museumId,
        chunkId: `${artwork.id}_provenance`,
        content: `Provenance for ${artwork.title}: ${artwork.provenance}`,
        metadata: {
          title: artwork.title,
          artist: artwork.artist,
          year: artwork.year,
          location: artwork.location,
          chunkType: 'provenance'
        }
      });
    }

    // Technical details chunk
    if (artwork.medium || artwork.dimensions) {
      const technical = [
        artwork.medium && `Medium: ${artwork.medium}`,
        artwork.dimensions && `Dimensions: ${artwork.dimensions}`
      ].filter(Boolean).join('. ');
      
      chunks.push({
        id: artwork.id,
        museumId,
        chunkId: `${artwork.id}_technical`,
        content: `Technical details for ${artwork.title}: ${technical}`,
        metadata: {
          title: artwork.title,
          artist: artwork.artist,
          year: artwork.year,
          location: artwork.location,
          chunkType: 'technical_details'
        }
      });
    }

    // Curator notes as separate chunks
    if (artwork.curator_notes && artwork.curator_notes.length > 0) {
      artwork.curator_notes.forEach((note, idx) => {
        chunks.push({
          id: artwork.id,
          museumId,
          chunkId: `${artwork.id}_curator_${idx}`,
          content: `Curator note for ${artwork.title} (${note.type || 'general'}): ${note.content}`,
          metadata: {
            title: artwork.title,
            artist: artwork.artist,
            year: artwork.year,
            location: artwork.location,
            chunkType: 'curator_note'
          }
        });
      });
    }

    return chunks;
  }

  private splitText(text: string, maxLength: number): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk.length > 0 ? '. ' : '') + sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Create embeddings for all chunks
  async createEmbeddings(chunks: ChunkedArtwork[]): Promise<void> {
    const batchSize = 100; // OpenAI recommends batching
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small', // Cheaper than ada-002, similar quality
          input: texts,
          encoding_format: 'float'
        });

        response.data.forEach((embedding, idx) => {
          const chunk = batch[idx];
          chunk.embedding = embedding.embedding;
          this.embeddings.set(chunk.chunkId, embedding.embedding);
        });

        // Rate limit: 3000 RPM for embedding endpoint
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to create embeddings for batch ${i}:`, error);
        throw error;
      }
    }
  }

  // Cosine similarity for vector search
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Semantic search with query embedding
  async semanticSearch(
    query: string, 
    museumId?: string, 
    topK: number = 5
  ): Promise<ChunkedArtwork[]> {
    // Create query embedding
    const queryResponse = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: [query],
      encoding_format: 'float'
    });
    
    const queryEmbedding = queryResponse.data[0].embedding;
    
    // Get relevant chunks
    const relevantChunks = museumId 
      ? (this.chunks.get(museumId) || [])
      : Array.from(this.chunks.values()).flat();

    // Calculate similarities and rank
    const rankedChunks = relevantChunks
      .filter(chunk => chunk.embedding)
      .map(chunk => ({
        chunk,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding!)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(item => item.chunk);

    return rankedChunks;
  }

  // Store chunks for a museum
  storeChunks(museumId: string, chunks: ChunkedArtwork[]): void {
    this.chunks.set(museumId, chunks);
  }

  // Get all chunks for debugging/admin
  getAllChunks(museumId?: string): ChunkedArtwork[] {
    if (museumId) {
      return this.chunks.get(museumId) || [];
    }
    return Array.from(this.chunks.values()).flat();
  }
}