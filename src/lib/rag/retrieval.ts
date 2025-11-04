// src/lib/rag/retrieval.ts (path structure fixed)
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
  }

  private normalizeArtworkData(rawArtwork: any, museum: Museum): ArtworkData {
    // Normalize curator notes from your JSON format to the expected interface
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
      return;
    }

    // FIXED: Museums and their individual files are in the same folder
    const museumsPath = path.join(this.dataPath, 'museums.json');
    
    try {
      console.log(`Loading museums from: ${museumsPath}`);
      const museumsData = await fs.readFile(museumsPath, 'utf-8');
      const museums: Museum[] = JSON.parse(museumsData);
      
      console.log(`Found ${museums.length} museums to load`);
      
      for (const museum of museums) {
        console.log(`Loading artworks for museum: ${museum.name} (${museum.id})`);
        
        // Store museum information first
        this.museums.set(museum.id, museum);
        
        // Museum files are in the same folder as museums.json
        const museumFilePath = path.join(this.dataPath, `${museum.id}.json`);
        console.log(`Looking for museum file at: ${museumFilePath}`);
        
        try {
          const museumData = await fs.readFile(museumFilePath, 'utf-8');
          const museumInfo: MuseumJsonData = JSON.parse(museumData);
          
          if (museumInfo.artworks && Array.isArray(museumInfo.artworks)) {
            for (const rawArtwork of museumInfo.artworks) {
              const artworkData = this.normalizeArtworkData(rawArtwork, museum);
              
              // Store with composite key: museumId:artworkId
              const compositeKey = `${museum.id}:${rawArtwork.id}`;
              this.artworks.set(compositeKey, artworkData);
              console.log(`  -> Loaded artwork: ${artworkData.title} by ${artworkData.artist}`);
            }
            console.log(`✓ Loaded ${museumInfo.artworks.length} artworks for ${museum.name}`);
          } else {
            console.warn(`⚠ No artworks array found in ${museum.name} data file`);
          }
          
        } catch (fileError) {
          const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
          console.error(`✗ Failed to load artworks for museum ${museum.id} (${museum.name}):`, errorMessage);
          console.error(`  Expected file: ${museumFilePath}`);
          
          // SPECIAL CASE: Try to load sample-museum as fallback for missing museums
          if (museum.id === 'sample-museum') {
            console.log('🔄 Trying to load sample-museum.json as fallback...');
            await this.loadSampleMuseumFallback(museum);
          }
          
          continue; // Continue with other museums
        }
      }
      
      console.log(`🎨 RAG initialization completed:`);
      console.log(`  - ${museums.length} museums loaded`);
      console.log(`  - ${this.artworks.size} total artworks loaded`);
      console.log(`  - Available museums: ${Array.from(this.museums.keys()).join(', ')}`);
      this.initialized = true;
      
    } catch (error) {
      console.error('💥 Failed to initialize RAG system:', error);
      console.error(`Expected museums.json at: ${museumsPath}`);
      
      // Create a minimal fallback system for development
      console.log('🔧 Creating fallback museum system...');
      await this.createFallbackSystem();
    }
  }

  // Load sample-museum.json as fallback when individual museum files are missing
  private async loadSampleMuseumFallback(museum: Museum): Promise<void> {
    try {
      const samplePath = path.join(this.dataPath, 'sample-museum.json');
      console.log(`  Trying sample-museum at: ${samplePath}`);
      
      const sampleData = await fs.readFile(samplePath, 'utf-8');
      const sampleInfo: MuseumJsonData = JSON.parse(sampleData);
      
      if (sampleInfo.artworks && Array.isArray(sampleInfo.artworks)) {
        for (const rawArtwork of sampleInfo.artworks) {
          const artworkData = this.normalizeArtworkData(rawArtwork, museum);
          
          const compositeKey = `${museum.id}:${rawArtwork.id}`;
          this.artworks.set(compositeKey, artworkData);
          console.log(`  -> Loaded fallback artwork: ${artworkData.title} by ${artworkData.artist}`);
        }
        console.log(`✓ Loaded ${sampleInfo.artworks.length} fallback artworks for ${museum.name}`);
      }
    } catch (fallbackError) {
      console.error(`✗ Sample museum fallback also failed:`, fallbackError);
    }
  }

  // Create minimal fallback for complete system failure
  private async createFallbackSystem(): Promise<void> {
    const defaultMuseum: Museum = {
      id: 'default',
      name: 'Default Museum',
      description: 'Fallback museum for testing when data files are missing',
    };
    this.museums.set('default', defaultMuseum);
    
    // Create a test artwork
    const testArtwork: ArtworkData = {
      id: 'test-artwork-1',
      title: 'Test Artwork',
      artist: 'Test Artist',
      year: 2024,
      medium: 'Test Medium',
      dimensions: '100x100 cm',
      description: 'This is a test artwork created when the system cannot load museum data files.',
      curator_notes: [],
      museum: 'default',
      museum_name: 'Default Museum'
    };
    
    this.artworks.set('default:test-artwork-1', testArtwork);
    console.log('✓ Fallback system created with test artwork');
    this.initialized = true;
  }

  async getArtworkData(artworkId: string, museumId?: string): Promise<ArtworkData | null> {
    await this.initialize();
    
    console.log(`🔍 Looking for artwork: ${artworkId}${museumId ? ` in museum: ${museumId}` : ' (any museum)'}`);
    
    if (museumId) {
      const key = `${museumId}:${artworkId}`;
      const artwork = this.artworks.get(key);
      if (artwork) {
        console.log(`✓ Found artwork: ${artwork.title} by ${artwork.artist}`);
        return artwork;
      }
      
      console.log(`⚠ Artwork ${artworkId} not found in museum ${museumId}`);
      const availableInMuseum = Array.from(this.artworks.keys())
        .filter(key => key.startsWith(`${museumId}:`))
        .map(key => key.split(':')[1]);
      console.log(`  Available artworks in ${museumId}:`, availableInMuseum.slice(0, 5).join(', ') + (availableInMuseum.length > 5 ? '...' : ''));
    }
    
    // Try to find in any museum if museumId not provided or not found
    for (const [key, artwork] of this.artworks) {
      if (artwork.id === artworkId) {
        console.log(`✓ Found artwork ${artworkId} in museum: ${artwork.museum}`);
        return artwork;
      }
    }
    
    console.log(`✗ Artwork ${artworkId} not found in any museum`);
    console.log(`  Available museums: ${Array.from(this.museums.keys()).join(', ')}`);
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
    
    console.log(`📋 Found ${artworks.length} artworks for museum: ${museumId}`);
    if (artworks.length === 0) {
      console.log(`Available museums: ${Array.from(this.museums.keys()).join(', ')}`);
    }
    
    return artworks;
  }

  // Fallback keyword search
  async keywordSearch(query: string, museumId?: string): Promise<ArtworkData[]> {
    await this.initialize();
    const lowerQuery = query.toLowerCase();
    const results: ArtworkData[] = [];

    for (const [key, artwork] of this.artworks) {
      // If museumId specified, only search that museum
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

    console.log(`🔍 Keyword search "${query}" found ${results.length} results${museumId ? ` in ${museumId}` : ''}`);
    return results;
  }

  // New semantic search method
  async semanticSearch(
    query: string, 
    museumId?: string, 
    topK: number = 5
  ): Promise<ChunkedArtwork[]> {
    await this.initialize();
    console.log(`🧠 Semantic search: "${query}"${museumId ? ` in ${museumId}` : ''} (top ${topK})`);
    return this.embeddings.semanticSearch(query, museumId, topK);
  }

  // Hybrid search: combine semantic + keyword
  async hybridSearch(
    query: string, 
    museumId?: string, 
    topK: number = 5
  ): Promise<{ chunks: ChunkedArtwork[]; keywordResults: ArtworkData[] }> {
    const [chunks, keywordResults] = await Promise.all([
      this.semanticSearch(query, museumId, topK),
      this.keywordSearch(query, museumId)
    ]);

    return { chunks, keywordResults: keywordResults.slice(0, 3) };
  }

  getMuseums(): Museum[] {
    return Array.from(this.museums.values());
  }

  // Format artwork context for API responses
  formatArtworkContext(artwork: ArtworkData): string {
    const parts = [
      `Title: ${artwork.title}`,
      `Artist: ${artwork.artist}`,
      artwork.year && `Year: ${artwork.year}`,
      artwork.medium && `Medium: ${artwork.medium}`,
      artwork.dimensions && `Dimensions: ${artwork.dimensions}`,
      artwork.location && `Location: ${artwork.location}`,
      artwork.description && `Description: ${artwork.description}`,
      artwork.provenance && `Provenance: ${artwork.provenance}`
    ].filter(Boolean);

    // Add curator notes if any
    if (artwork.curator_notes && artwork.curator_notes.length > 0) {
      parts.push(''); // Empty line
      parts.push('Curator Notes:');
      artwork.curator_notes.forEach((note, index) => {
        parts.push(`${index + 1}. ${note.content} (${note.type || 'general'}) - ${note.curator_name}`);
      });
    }

    return parts.join('\n');
  }

  // Keep for backward compatibility, but deprecate
  async searchArtworks(query: string, museumId?: string): Promise<ArtworkData[]> {
    console.warn('⚠ searchArtworks is deprecated, use semanticSearch instead');
    return this.keywordSearch(query, museumId);
  }

  async addCuratorNote(artworkId: string, museumId: string, note: string): Promise<void> {
    await this.initialize();
    
    const key = `${museumId}:${artworkId}`;
    const artwork = this.artworks.get(key);
    if (!artwork) {
      throw new Error(`Artwork ${artworkId} not found in museum ${museumId}`);
    }
    
    if (!artwork.curator_notes) artwork.curator_notes = [];
    artwork.curator_notes.push({
      id: Date.now().toString(),
      content: note,
      curator_name: 'curator', // You might want to get this from auth context
      created_at: new Date().toISOString(),
      type: 'interpretation'
    });

    // Re-chunk and re-embed this artwork
    const newChunks = this.embeddings.chunkArtwork(artwork, museumId);
    await this.embeddings.createEmbeddings(newChunks);
    
    // Update stored chunks (in production, use a proper vector DB)
    const existingChunks = this.embeddings.getAllChunks(museumId);
    const filteredChunks = existingChunks.filter(chunk => chunk.id !== artworkId);
    this.embeddings.storeChunks(museumId, [...filteredChunks, ...newChunks]);

    // Save to file
    await this.saveMuseumDataToFile(museumId);
  }

  async saveArtworkData(artwork: ArtworkData, museumId: string): Promise<void> {
    await this.initialize();
    
    const key = `${museumId}:${artwork.id}`;
    this.artworks.set(key, {
      ...artwork,
      museum: museumId,
      museum_name: this.museums.get(museumId)?.name || 'Unknown Museum'
    });

    // Re-chunk and re-embed this artwork
    const newChunks = this.embeddings.chunkArtwork(artwork, museumId);
    await this.embeddings.createEmbeddings(newChunks);
    
    // Update stored chunks
    const existingChunks = this.embeddings.getAllChunks(museumId);
    const filteredChunks = existingChunks.filter(chunk => chunk.id !== artwork.id);
    this.embeddings.storeChunks(museumId, [...filteredChunks, ...newChunks]);

    // Save to file
    await this.saveMuseumDataToFile(museumId);
  }

  // Helper method to save museum data back to JSON file
  private async saveMuseumDataToFile(museumId: string): Promise<void> {
    try {
      const museumArtworks = await this.getMuseumArtworks(museumId);
      const museum = this.museums.get(museumId);
      
      if (!museum) {
        throw new Error(`Museum ${museumId} not found`);
      }

      // Museum files are in the same folder as museums.json
      const museumFilePath = path.join(this.dataPath, `${museumId}.json`);
      
      const museumData: MuseumJsonData = {
        id: museumId,
        name: museum.name,
        description: museum.description,
        artworks: museumArtworks.map(artwork => {
          // Convert back to raw format for JSON storage
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
      console.log(`✓ Saved ${museumArtworks.length} artworks to ${museumFilePath}`);
      
    } catch (error) {
      console.error(`✗ Failed to save museum ${museumId} data to file:`, error);
      throw error;
    }
  }
}