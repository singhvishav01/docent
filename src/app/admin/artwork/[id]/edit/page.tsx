// src/app/admin/artwork/[id]/edit/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArtworkForm } from '@/components/admin/ArtworkForm';
import { ArtworkData, Museum } from '@/lib/rag/types';

interface EditArtworkPageProps {
  params: { id: string };
}

export default function EditArtworkPage({ params }: EditArtworkPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const artworkId = params.id;
  const museumId = searchParams.get('museum');
  
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [artwork, setArtwork] = useState<ArtworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [artworkId, museumId]);

  const loadData = async () => {
    try {
      // Load museums
      const museumsResponse = await fetch('/api/museums');
      if (!museumsResponse.ok) {
        throw new Error('Failed to load museums');
      }
      const museumsData = await museumsResponse.json();
      setMuseums(museumsData);

      // Load artwork
      if (!museumId) {
        throw new Error('Museum ID is required');
      }

      const artworkResponse = await fetch(`/api/artworks/${artworkId}?museum=${museumId}`);
      if (!artworkResponse.ok) {
        throw new Error('Failed to load artwork');
      }
      const artworkData = await artworkResponse.json();
      setArtwork(artworkData.artwork);

    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (updatedArtwork: ArtworkData, newMuseumId: string) => {
    try {
      const response = await fetch('/api/admin/artwork', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          artwork: updatedArtwork, 
          museumId: newMuseumId 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update artwork');
      }

      // Redirect back to museum artworks page
      router.push(`/admin/museum/${newMuseumId}/artworks?success=updated&artwork=${updatedArtwork.id}`);
    } catch (error) {
      throw error; // Let ArtworkForm handle the error display
    }
  };

  const handleCancel = () => {
    if (museumId) {
      router.push(`/admin/museum/${museumId}/artworks`);
    } else {
      router.push('/admin/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading artwork...</p>
        </div>
      </div>
    );
  }

  if (error || !artwork) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h2 className="text-red-800 font-semibold mb-2">Error Loading Artwork</h2>
            <p className="text-red-600 text-sm">{error || 'Artwork not found'}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={loadData} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (museums.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h2 className="text-yellow-800 font-semibold mb-2">No Museums Found</h2>
            <p className="text-yellow-700 text-sm">
              Cannot edit artwork without available museums.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <span 
              className="cursor-pointer hover:text-blue-600"
              onClick={() => router.push('/admin/dashboard')}
            >
              Admin Dashboard
            </span>
            <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {museumId && (
              <>
                <span 
                  className="cursor-pointer hover:text-blue-600"
                  onClick={() => router.push(`/admin/museum/${museumId}/artworks`)}
                >
                  {museums.find(m => m.id === museumId)?.name || museumId}
                </span>
                <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
            <span>Edit Artwork</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Artwork</h1>
          <p className="text-gray-600 mt-2">
            Update artwork information for "{artwork.title}"
          </p>
        </div>

        <ArtworkForm 
          artwork={artwork}
          museums={museums}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={true}
        />
      </div>
    </div>
  );
}