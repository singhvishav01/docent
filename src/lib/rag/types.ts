// src/lib/rag/types.ts
export interface ArtworkData {
  id: string;
  title: string;
  artist: string;
  year?: number;
  description?: string; // Made optional since some artworks might not have descriptions
  medium?: string;
  dimensions?: string;
  location?: string;
  provenance?: string;
  curator_notes?: CuratorNote[]; // Made optional since new artworks might not have notes
  created_at?: string;
  updated_at?: string;
  // Additional fields that exist in your JSON but not in the original interface
  image_url?: string;
  gallery?: string;
  accession_number?: string;
  period?: string;
  // These are added when loading from the museum
  museum?: string;
  museum_name?: string;
}

export interface CuratorNote {
  id: string;
  content: string;
  curator_name: string;
  created_at: string;
  type?: 'interpretation' | 'historical_context' | 'technical_analysis' | 'visitor_info';
}

export interface Museum {
  id: string;
  name: string;
  description?: string;
  location?: string;
  folder_path?: string; // Made optional since it's not in your JSON data
}

// Raw JSON structure from your museum files
export interface MuseumJsonData {
  id: string;
  name: string;
  description?: string;
  artworks: RawArtworkData[];
}

// Raw artwork structure from JSON (before processing)
export interface RawArtworkData {
  id: string;
  title: string;
  artist: string;
  year?: number;
  description?: string;
  medium?: string;
  dimensions?: string;
  location?: string;
  provenance?: string;
  image_url?: string;
  gallery?: string;
  accession_number?: string;
  period?: string;
  curator_notes?: RawCuratorNote[];
}

// Raw curator note structure from JSON
export interface RawCuratorNote {
  note?: string;  // Your JSON uses "note" instead of "content"
  author?: string; // Your JSON uses "author" instead of "curator_name"
  date?: string;   // Your JSON uses "date" instead of "created_at"
  // Also support the normalized format
  id?: string;
  content?: string;
  curator_name?: string;
  created_at?: string;
  type?: 'interpretation' | 'historical_context' | 'technical_analysis' | 'visitor_info';
}