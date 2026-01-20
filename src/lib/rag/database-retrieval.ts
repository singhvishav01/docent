// src/lib/rag/database-retrieval.ts
import { PrismaClient } from '@prisma/client';
import { ArtworkData, Museum, CuratorNote } from './types';

// FIXED: Don't create client at module level
let prismaInstance: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    // HARDCODED FALLBACK - bypasses all .env issues
    const connectionString = "postgresql://postgres:docent_dev_password@127.0.0.1:5433/docent?schema=public";
    
    console.log('🔧 Creating Prisma Client with direct connection');
    
    prismaInstance = new PrismaClient({
      datasourceUrl: connectionString,
    });
  }
  return prismaInstance;
}

export class DatabaseRetrieval {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🔌 Initializing database-backed RAG system...');
    
    try {
      const prisma = getPrismaClient();
      await prisma.$connect();
      const museumCount = await prisma.museum.count();
      const artworkCount = await prisma.artwork.count();
      console.log(`✅ Connected to database: ${museumCount} museums, ${artworkCount} artworks`);
      this.initialized = true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async getArtworkData(artworkId: string, museumId?: string): Promise<ArtworkData | null> {
    await this.initialize();
    const prisma = getPrismaClient(); // ← Use function

    try {
      // ... rest of the method stays the same
      let artwork;

      if (museumId) {
        artwork = await prisma.artwork.findUnique({
          where: {
            museumId_id: { museumId, id: artworkId }
          },
          include: {
            museum: true
          }
        });
      }

      if (!artwork) {
        const artworks = await prisma.artwork.findMany({
          where: { id: artworkId },
          include: { museum: true },
          take: 1
        });
        artwork = artworks[0];
      }

      if (!artwork) return null;

      const curatorNotes = await prisma.curatorNote.findMany({
        where: {
          museumId: artwork.museumId,
          artworkId: artwork.id
        },
        include: {
          curator: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return this.transformToArtworkData(artwork, curatorNotes);

    } catch (error) {
      console.error('Error fetching artwork:', error);
      return null;
    }
  }

  async getMuseumArtworks(museumId: string): Promise<ArtworkData[]> {
    await this.initialize();
    const prisma = getPrismaClient(); // ← Use function

    try {
      const artworks = await prisma.artwork.findMany({
        where: { 
          museumId,
          isActive: true 
        },
        include: { museum: true },
        orderBy: { title: 'asc' }
      });

      const results: ArtworkData[] = [];

      for (const artwork of artworks) {
        const curatorNotes = await prisma.curatorNote.findMany({
          where: {
            museumId: artwork.museumId,
            artworkId: artwork.id
          },
          include: {
            curator: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        results.push(this.transformToArtworkData(artwork, curatorNotes));
      }

      return results;

    } catch (error) {
      console.error('Error fetching museum artworks:', error);
      return [];
    }
  }

  async getMuseums(): Promise<Museum[]> {
    await this.initialize();
    const prisma = getPrismaClient(); // ← Use function

    try {
      const museums = await prisma.museum.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });

      return museums.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description || undefined,
        location: m.location || undefined
      }));

    } catch (error) {
      console.error('Error fetching museums:', error);
      return [];
    }
  }

  async searchArtworks(query: string, museumId?: string): Promise<ArtworkData[]> {
    await this.initialize();
    const prisma = getPrismaClient(); // ← Use function

    try {
      const whereClause: any = {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      };

      if (museumId) {
        whereClause.museumId = museumId;
      }

      const artworks = await prisma.artwork.findMany({
        where: whereClause,
        include: { museum: true },
        take: 10
      });

      const results: ArtworkData[] = [];

      for (const artwork of artworks) {
        const curatorNotes = await prisma.curatorNote.findMany({
          where: {
            museumId: artwork.museumId,
            artworkId: artwork.id
          },
          include: {
            curator: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        results.push(this.transformToArtworkData(artwork, curatorNotes));
      }

      return results;

    } catch (error) {
      console.error('Error searching artworks:', error);
      return [];
    }
  }

  formatArtworkContext(artwork: ArtworkData): string {
    const parts = [
      `Title: ${artwork.title}`,
      `Artist: ${artwork.artist}`,
      artwork.year && `Year: ${artwork.year}`,
      artwork.medium && `Medium: ${artwork.medium}`,
      artwork.dimensions && `Dimensions: ${artwork.dimensions}`,
      artwork.description && `Description: ${artwork.description}`,
      artwork.provenance && `Provenance: ${artwork.provenance}`
    ].filter(Boolean);

    if (artwork.curator_notes && artwork.curator_notes.length > 0) {
      parts.push('');
      parts.push('Curator Notes:');
      artwork.curator_notes.forEach((note, index) => {
        parts.push(`${index + 1}. ${note.content} (${note.type || 'general'}) - ${note.curator_name}`);
      });
    }

    return parts.join('\n');
  }

  private transformToArtworkData(artwork: any, curatorNotes: any[]): ArtworkData {
    return {
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      year: artwork.year || undefined,
      description: artwork.description || undefined,
      medium: artwork.medium || undefined,
      dimensions: artwork.dimensions || undefined,
      location: artwork.gallery || undefined,
      provenance: artwork.provenance || undefined,
      image_url: artwork.imageUrl || undefined,
      gallery: artwork.gallery || undefined,
      accession_number: artwork.accessionNumber || undefined,
      period: artwork.period || undefined,
      museum: artwork.museumId,
      museum_name: artwork.museum?.name,
      curator_notes: curatorNotes.map(note => ({
        id: note.id,
        content: note.content,
        curator_name: note.curator?.name || note.curator?.email || 'Unknown',
        created_at: note.createdAt.toISOString(),
        type: note.type as any
      })),
      created_at: artwork.createdAt?.toISOString(),
      updated_at: artwork.updatedAt?.toISOString()
    };
  }

  async disconnect(): Promise<void> {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
      prismaInstance = null;
    }
  }
}