'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArtworkData, Museum } from '@/lib/rag/types';

interface MuseumArtworksPageProps {
  params: { id: string };
}

export default function MuseumArtworksPage({ params }: MuseumArtworksPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const museumId = params.id;
  
  const [museum, setMuseum] = useState<Museum | null>(null);
  const [artworks, setArtworks] = useState<ArtworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Success message handling
  const success = searchParams.get('success');
  const artworkId = searchParams.get('artwork');
  const [showSuccess, setShowSuccess] = useState(!!success);

  useEffect(() => {
    loadMuseumData();
  }, [museumId]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const loadMuseumData = async () => {
    try {
      const [museumResponse, artworksResponse] = await Promise.all([
        fetch('/api/museums'),
        fetch(`/api/admin/museum/${museumId}/artworks`)
      ]);

      if (!museumResponse.ok || !artworksResponse.ok) {
        throw new Error('Failed to load museum data');
      }

      const museums = await museumResponse.json();
      const foundMuseum = museums.find((m: Museum) => m.id === museumId);
      
      if (!foundMuseum) {
        throw new Error('Museum not found');
      }

      const artworksData = await artworksResponse.json();
      
      setMuseum(foundMuseum);
      setArtworks(artworksData);
    } catch (err) {
      console.error('Failed to load museum data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const filteredArtworks = artworks.filter(artwork =>
    artwork.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artwork.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artwork.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSuccessMessage = () => {
    if (success === 'created') {
      return `Artwork "${artworkId}" has been successfully created!`;
    } else if (success === 'updated') {
      return `Artwork "${artworkId}" has been successfully updated!`;
    }
    return 'Operation completed successfully!';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading museum artworks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h2 className="text-red-800 font-semibold mb-2">Error Loading Museum</h2>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={loadMuseumData} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/admin/dashboard"
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-800 font-medium">{getSuccessMessage()}</p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="text-green-600 hover:text-green-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Link href="/admin/dashboard" className="hover:text-blue-600">
              Admin Dashboard
            </Link>
            <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>{museum?.name} Artworks</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{museum?.name}</h1>
              <p className="text-gray-600 mt-1">
                Managing {artworks.length} artwork{artworks.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href={`/admin/artwork/new?museum=${museumId}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Artwork
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search artworks by title, artist, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <Link
              href={`/admin/test-chat?museum=${museumId}`}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Test Chat
            </Link>
          </div>
        </div>

        {/* Artworks Grid */}
        {filteredArtworks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="text-center py-12">
              {artworks.length === 0 ? (
                <div>
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Artworks Yet</h3>
                  <p className="text-gray-600 mb-4">Start building your museum collection by adding your first artwork.</p>
                  <Link
                    href={`/admin/artwork/new?museum=${museumId}`}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add First Artwork
                  </Link>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No artworks match your search</h3>
                  <p className="text-gray-600">Try adjusting your search terms or clear the search to see all artworks.</p>
                </div>
              )}
            </div>
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
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{artwork.title}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded ml-2 whitespace-nowrap">
                      {artwork.id}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1">{artwork.artist}</p>
                  
                  {artwork.year && (
                    <p className="text-xs text-gray-500 mb-2">{artwork.year}</p>
                  )}

                  {artwork.description && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-3">{artwork.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    {artwork.gallery && (
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {artwork.gallery}
                      </span>
                    )}
                    {artwork.curator_notes && artwork.curator_notes.length > 0 && (
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {artwork.curator_notes.length} note{artwork.curator_notes.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/admin/artwork/${artwork.id}/edit?museum=${museumId}`}
                      className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/artwork/${artwork.id}?museum=${museumId}`}
                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
                      target="_blank"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}