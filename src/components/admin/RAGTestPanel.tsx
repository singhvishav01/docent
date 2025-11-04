'use client';

import { useState, useEffect } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';

interface Museum {
  id: string;
  name: string;
  description?: string;
  location?: string;
  folder_path: string;
}

interface Artwork {
  id: string;
  title: string;
  artist: string;
  year?: number;
  description: string;
  curator_notes: any[];
}

export function RAGTestPanel() {
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [selectedMuseum, setSelectedMuseum] = useState<string>('');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadMuseums();
  }, []);

  useEffect(() => {
    if (selectedMuseum) {
      loadArtworks(selectedMuseum);
    }
  }, [selectedMuseum]);

  const loadMuseums = async () => {
    try {
      const response = await fetch('/api/museums');
      const data = await response.json();
      setMuseums(data);
      if (data.length > 0) {
        setSelectedMuseum(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load museums:', error);
      setError('Failed to load museums');
    }
  };

  const loadArtworks = async (museumId: string) => {
    setLoading(true);
    setError('');
    try {
      // Create a new API endpoint to get artworks by museum
      const response = await fetch(`/api/museums/${museumId}/artworks`);
      if (response.ok) {
        const data = await response.json();
        setArtworks(data.artworks || []);
      } else {
        // Fallback: try to get known artworks based on museum ID
        const knownArtworks = getKnownArtworks(museumId);
        setArtworks(knownArtworks);
      }
      setSelectedArtwork(''); // Reset selection
    } catch (error) {
      console.error('Failed to load artworks:', error);
      // Fallback to known artworks
      const knownArtworks = getKnownArtworks(museumId);
      setArtworks(knownArtworks);
      if (knownArtworks.length === 0) {
        setError(`No artworks found for ${museumId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fallback function with known artworks
  const getKnownArtworks = (museumId: string): Artwork[] => {
    const knownArtworks: Record<string, Artwork[]> = {
      'met': [
        {
          id: 'washington_crossing',
          title: 'Washington Crossing the Delaware',
          artist: 'Emanuel Leutze',
          year: 1851,
          description: 'Iconic American historical painting',
          curator_notes: []
        }
      ],
      'moma': [
        {
          id: 'starry_night',
          title: 'The Starry Night',
          artist: 'Vincent van Gogh',
          year: 1889,
          description: 'Famous post-impressionist masterpiece',
          curator_notes: []
        }
      ],
      'louvre': [
        {
          id: 'mona_lisa',
          title: 'Mona Lisa',
          artist: 'Leonardo da Vinci',
          year: 1517,
          description: 'World\'s most famous portrait',
          curator_notes: []
        }
      ],
      'sample-museum': [
        {
          id: 'test-artwork-1',
          title: 'Sample Artwork',
          artist: 'Test Artist',
          year: 2024,
          description: 'Test artwork for development',
          curator_notes: []
        },
        {
          id: 'test-artwork-2',
          title: 'Abstract Expression',
          artist: 'Modern Test Artist',
          year: 2024,
          description: 'Abstract test artwork',
          curator_notes: []
        },
        {
          id: 'test-artwork-4',
          title: 'Digital Landscape',
          artist: 'Tech Artist Collective',
          year: 2024,
          description: 'Digital art test piece',
          curator_notes: []
        }
      ]
    };
    return knownArtworks[museumId] || [];
  };

  const addTestCuratorNote = async () => {
    if (!selectedArtwork || !selectedMuseum) return;

    try {
      const response = await fetch('/api/curator/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: selectedArtwork,
          museumId: selectedMuseum,
          content: `Test curator note added on ${new Date().toLocaleString()}. This demonstrates how curator insights are integrated into the RAG system.`,
          curatorName: 'Test Curator',
          type: 'interpretation'
        })
      });

      if (response.ok) {
        alert('Curator note added successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to add curator note: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to add curator note:', error);
      alert('Error adding curator note');
    }
  };

  const testArtworkAccess = async () => {
    if (!selectedArtwork || !selectedMuseum) return;

    try {
      const response = await fetch(`/api/artworks/${selectedArtwork}?museum=${selectedMuseum}`);
      const data = await response.json();
      
      if (response.ok) {
        alert(`Artwork found!\nTitle: ${data.artwork.title}\nArtist: ${data.artwork.artist}`);
      } else {
        alert(`Artwork not found: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to test artwork access:', error);
      alert('Error testing artwork access');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">RAG System Test Panel</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Museum
            </label>
            <select
              value={selectedMuseum}
              onChange={(e) => setSelectedMuseum(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a museum</option>
              {museums.map(museum => (
                <option key={museum.id} value={museum.id}>
                  {museum.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Artwork ({artworks.length} available)
            </label>
            {loading ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                Loading artworks...
              </div>
            ) : artworks.length > 0 ? (
              <select
                value={selectedArtwork}
                onChange={(e) => setSelectedArtwork(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an artwork</option>
                {artworks.map(artwork => (
                  <option key={artwork.id} value={artwork.id}>
                    {artwork.title} - {artwork.artist}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedArtwork}
                onChange={(e) => setSelectedArtwork(e.target.value)}
                placeholder="No artworks found - enter ID manually"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={testArtworkAccess}
            disabled={!selectedArtwork || !selectedMuseum}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Test Artwork Access
          </button>
          <button
            onClick={addTestCuratorNote}
            disabled={!selectedArtwork || !selectedMuseum}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Add Test Curator Note
          </button>
        </div>

        {selectedArtwork && selectedMuseum && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-4">
              Test Chat Interface - {artworks.find(a => a.id === selectedArtwork)?.title || selectedArtwork}
            </h3>
            <div className="h-96">
              <ChatInterface 
                artworkId={selectedArtwork}
                museumId={selectedMuseum}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}