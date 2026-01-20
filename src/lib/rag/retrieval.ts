// src/lib/rag/retrieval.ts - FIXED with better error handling and BOM removal
import { EmbeddingsService, ChunkedArtwork } from './embeddings';
import { ArtworkData, Museum, CuratorNote, MuseumJsonData, RawCuratorNote } from './types';
import fs from 'fs/promises';
import path from 'path';

export class RAGRetrieval {
  private dataPath: string;
  private museums: Map<string, Museum> = new Map();
  private artworks: Map<string, ArtworkData> = new Map();
  private embeddings: EmbeddingsService;
  private initialized = false;

  constructor(dataPath: string, openaiApiKey: string) {
    this.dataPath = dataPath;
    this.embeddings = new EmbeddingsService(openaiApiKey);
    console.log(`🎨 RAG System initialized with data path: ${dataPath}`);
  }

  // Helper to remove BOM and parse JSON safely
  private async readAndParseJSON(filePath: string): Promise<any> {
    try {
      const rawData = await fs.readFile(filePath, 'utf-8');
      
      // Remove BOM if present
      const cleanData = rawData.replace(/^\uFEFF/, '').trim();
      
      // Parse JSON
      const parsed = JSON.parse(cleanData);
      
      console.log(`✅ Successfully parsed: ${path.basename(filePath)}`);
      return parsed;
    } catch (error) {
      console.error(`❌ Failed to parse ${filePath}:`, error);
      throw new Error(`JSON parse error in ${path.basename(filePath)}: ${error.message}`);
    }
  }

  private normalizeArtworkData(rawArtwork: any, museum: Museum): ArtworkData {
    const normalizedCuratorNotes: CuratorNote[] = (rawArtwork.curator_notes || []).map((note: RawCuratorNote, index: number) => ({
      id: note.id || `note_${Date.now()}_${index}`,
      content: note.content || note.note || '',
      curator_name: note.curator_name || note.author || 'Unknown Curator',
      created_at: note.created_at || note.date || new Date().toISOString(),
      type: note.type || 'interpretation'
    }));

    return {
      id: rawArtwork.id,
      title: rawArtwork.title,
      artist: rawArtwork.artist,
      year: rawArtwork.year,
      description: rawArtwork.description || '',
      medium: rawArtwork.medium,
      dimensions: rawArtwork.dimensions,
      location: rawArtwork.location,
      provenance: rawArtwork.provenance,
      curator_notes: normalizedCuratorNotes,
      created_at: rawArtwork.created_at,
      updated_at: rawArtwork.updated_at,
      image_url: rawArtwork.image_url,
      gallery: rawArtwork.gallery,
      accession_number: rawArtwork.accession_number,
      period: rawArtwork.period,
      museum: museum.id,
      museum_name: museum.name
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️  RAG already initialized, skipping...');
      return;
    }

    console.log('🔄 Initializing RAG system...');
    const museumsPath = path.join(this.dataPath, 'museums.json');
    
    try {
      // Check if museums.json exists
      try {
        await fs.access(museumsPath);
      } catch {
        console.error(`❌ museums.json not found at: ${museumsPath}`);
        console.log('📂 Creating fallback system...');
        await this.createFallbackSystem();
        return;
      }

      console.log(`📖 Loading museums from: ${museumsPath}`);
      const museums: Museum[] = await this.readAndParseJSON(museumsPath);
      
      console.log(`✅ Found ${museums.length} museums in config`);
      
      for (const museum of museums) {
        console.log(`\n🏛️  Loading: ${museum.name} (${museum.id})`);
        this.museums.set(museum.id, museum);
        
        const museumFilePath = path.join(this.dataPath, `${museum.id}.json`);
        console.log(`   📄 Looking for: ${museumFilePath}`);
        
        try {
          // Check if file exists
          await fs.access(museumFilePath);
          
          const museumData: MuseumJsonData = await this.readAndParseJSON(museumFilePath);
          
          if (museumData.artworks && Array.isArray(museumData.artworks)) {
            console.log(`   📦 Found ${museumData.artworks.length} artworks`);
            
            for (const rawArtwork of museumData.artworks) {
              const artworkData = this.normalizeArtworkData(rawArtwork, museum);
              const compositeKey = `${museum.id}:${rawArtwork.id}`;
              this.artworks.set(compositeKey, artworkData);
              console.log(`      ✓ ${artworkData.title} by ${artworkData.artist}`);
            }
          } else {
            console.warn(`   ⚠️  No artworks array in ${museum.id}.json`);
          }
          
        } catch (fileError) {
          console.error(`   ❌ Failed to load ${museum.id}.json:`, fileError.message);
          continue;
        }
      }
      
      console.log(`\n✨ RAG initialization complete!`);
      console.log(`   Museums loaded: ${this.museums.size}`);
      console.log(`   Artworks loaded: ${this.artworks.size}`);
      console.log(`   Available museums: ${Array.from(this.museums.keys()).join(', ')}\n`);
      
      this.initialized = true;
      
    } catch (error) {
      console.error('💥 RAG initialization failed:', error);
      console.log('📂 Creating fallback system...');
      await this.createFallbackSystem();
    }
  }

  private async createFallbackSystem(): Promise<void> {
    console.log('🔧 Setting up fallback museum system...');
    
    const defaultMuseum: Museum = {
      id: 'met',
      name: 'Metropolitan Museum of Art',
      description: 'Fallback museum for testing',
    };
    this.museums.set('met', defaultMuseum);
    
    const testArtwork: ArtworkData = {
      id: 'washington_crossing',
      title: 'Washington Crossing the Delaware',
      artist: 'Emanuel Leutze',
      year: 1851,
      medium: 'Oil on canvas',
      dimensions: '378.5 cm × 647.7 cm',
      description: 'This iconic painting depicts George Washington crossing the Delaware River during the American Revolutionary War.',
      curator_notes: [],
      museum: 'met',
      museum_name: 'Metropolitan Museum of Art'
    };
    
    this.artworks.set('met:washington_crossing', testArtwork);
    console.log('✅ Fallback system created with test artwork');
    this.initialized = true;
  }

  async getArtworkData(artworkId: string, museumId?: string): Promise<ArtworkData | null> {
    await this.initialize();
    
    console.log(`🔍 Searching for artwork: ${artworkId}${museumId ? ` in ${museumId}` : ' (any museum)'}`);
    
    if (museumId) {
      const key = `${museumId}:${artworkId}`;
      const artwork = this.artworks.get(key);
      if (artwork) {
        console.log(`✅ Found: ${artwork.title} by ${artwork.artist}`);
        return artwork;
      }
      console.log(`⚠️  Not found in ${museumId}`);
    }
    
    // Search all museums
    for (const [key, artwork] of this.artworks) {
      if (artwork.id === artworkId) {
        console.log(`✅ Found in ${artwork.museum}: ${artwork.title}`);
        return artwork;
      }
    }
    
    console.log(`❌ Artwork ${artworkId} not found anywhere`);
    return null;
  }

  async getMuseumArtworks(museumId: string): Promise<ArtworkData[]> {
    await this.initialize();
    
    const artworks: ArtworkData[] = [];
    const prefix = `${museumId}:`;
    
    for (const [key, artwork] of this.artworks) {
      if (key.startsWith(prefix)) {
        artworks.push(artwork);
      }
    }
    
    console.log(`📋 Found ${artworks.length} artworks for ${museumId}`);
    return artworks;
  }

  getMuseums(): Museum[] {
    return Array.from(this.museums.values());
  }

  async keywordSearch(query: string, museumId?: string): Promise<ArtworkData[]> {
    await this.initialize();
    const lowerQuery = query.toLowerCase();
    const results: ArtworkData[] = [];

    for (const [key, artwork] of this.artworks) {
      if (museumId && !key.startsWith(`${museumId}:`)) {
        continue;
      }

      const matches = 
        artwork.title.toLowerCase().includes(lowerQuery) ||
        artwork.artist.toLowerCase().includes(lowerQuery) ||
        (artwork.description && artwork.description.toLowerCase().includes(lowerQuery));

      if (matches) {
        results.push(artwork);
      }
    }

    return results;
  }

  async semanticSearch(query: string, museumId?: string, topK: number = 5): Promise<ChunkedArtwork[]> {
    await this.initialize();
    return this.embeddings.semanticSearch(query, museumId, topK);
  }

  formatArtworkContext(artwork: ArtworkData): string {
    const parts = [
      `Title: ${artwork.title}`,
      `Artist: ${artwork.artist}`,
      artwork.year && `Year: ${artwork.year}`,
      artwork.medium && `Medium: ${artwork.medium}`,
      artwork.description && `Description: ${artwork.description}`
    ].filter(Boolean);

    if (artwork.curator_notes && artwork.curator_notes.length > 0) {
      parts.push('', 'Curator Notes:');
      artwork.curator_notes.forEach((note, index) => {
        parts.push(`${index + 1}. ${note.content}`);
      });
    }

    return parts.join('\n');
  }

  async saveArtworkData(artwork: ArtworkData, museumId: string): Promise<void> {
    await this.initialize();
    
    const key = `${museumId}:${artwork.id}`;
    this.artworks.set(key, {
      ...artwork,
      museum: museumId,
      museum_name: this.museums.get(museumId)?.name || 'Unknown Museum'
    });

    await this.saveMuseumDataToFile(museumId);
  }

  private async saveMuseumDataToFile(museumId: string): Promise<void> {
    try {
      const museumArtworks = await this.getMuseumArtworks(museumId);
      const museum = this.museums.get(museumId);
      
      if (!museum) {
        throw new Error(`Museum ${museumId} not found`);
      }

      const museumFilePath = path.join(this.dataPath, `${museumId}.json`);
      
      const museumData: MuseumJsonData = {
        id: museumId,
        name: museum.name,
        description: museum.description,
        artworks: museumArtworks.map(artwork => {
          const { museum, museum_name, ...rawArtwork } = artwork;
          return {
            ...rawArtwork,
            curator_notes: artwork.curator_notes?.map(note => ({
              note: note.content,
              author: note.curator_name,
              date: note.created_at,
              type: note.type
            }))
          };
        })
      };
      
      await fs.writeFile(museumFilePath, JSON.stringify(museumData, null, 2));
      console.log(`✅ Saved ${museumArtworks.length} artworks to ${museumFilePath}`);
      
    } catch (error) {
      console.error(`❌ Failed to save museum ${museumId} data:`, error);
      throw error;
    }
  }
}