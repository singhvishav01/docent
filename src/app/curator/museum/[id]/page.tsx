// src/app/curator/museum/[id]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Artwork {
  id: string;
  title: string;
  artist: string;
  year?: number;
  description?: string;
  image_url?: string;
}

interface Museum {
  id: string;
  name: string;
}

export default function CuratorMuseumPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const museumId = params.id;
  
  const [museum, setMuseum] = useState<Museum | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMuseumData();
  }, [museumId]);

  const loadMuseumData = async () => {
    try {
      const [museumsRes, artworksRes] = await Promise.all([
        fetch('/api/museums'),
        fetch(`/api/admin/museum/${museumId}/artworks`)
      ]);

      if (museumsRes.ok) {
        const museums = await museumsRes.json();
        const foundMuseum = museums.find((m: Museum) => m.id === museumId);
        setMuseum(foundMuseum);
      }

      if (artworksRes.ok) {
        const artworksData = await artworksRes.json();
        setArtworks(artworksData);
      }
    } catch (error) {
      console.error('Failed to load museum data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArtworks = artworks.filter(artwork =>
    artwork.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artwork.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading artworks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Link href="/curator" className="hover:text-blue-600">
              Curator Dashboard
            </Link>
            <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>{museum?.name || museumId}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{museum?.name || 'Museum Artworks'}</h1>
          <p className="text-gray-600 mt-2">Select an artwork to add or manage curator notes</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search artworks by title or artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Artworks Grid */}
        {filteredArtworks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Artworks Found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms.' : 'This museum has no artworks yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArtworks.map((artwork) => (
              <div key={artwork.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                {/* Artwork Image */}
                <div className="aspect-w-4 aspect-h-3 bg-gray-100 rounded-t-lg overflow-hidden">
                  {artwork.image_url ? (
                    <img
                      src={artwork.image_url}
                      alt={artwork.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Artwork Details */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">{artwork.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{artwork.artist}</p>
                  {artwork.year && (
                    <p className="text-xs text-gray-500 mb-3">{artwork.year}</p>
                  )}
                  {artwork.description && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">{artwork.description}</p>
                  )}
                  
                  <Link
                    href={`/curator/artwork/${artwork.id}?museum=${museumId}`}
                    className="block w-full bg-blue-600 text-white text-center py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Manage Notes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link 
            href="/curator"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}