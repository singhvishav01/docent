'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArtworkForm } from '@/components/admin/ArtworkForm';
import { ArtworkData, Museum } from '@/lib/rag/types';

export default function AddArtworkPage() {
  const router = useRouter();
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMuseums();
  }, []);

  const loadMuseums = async () => {
    try {
      const response = await fetch('/api/museums');
      if (!response.ok) {
        throw new Error('Failed to load museums');
      }
      const museumsData = await response.json();
      setMuseums(museumsData);
    } catch (err) {
      console.error('Failed to load museums:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (artwork: ArtworkData, museumId: string) => {
    try {
      const response = await fetch('/api/admin/artwork', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artwork, museumId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create artwork');
      }

      // Success - redirect to museum artworks page
      router.push(`/admin/museum/${museumId}/artworks?success=created&artwork=${artwork.id}`);
    } catch (error) {
      throw error; // Let ArtworkForm handle the error display
    }
  };

  const handleCancel = () => {
    router.push('/admin/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading museums...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h2 className="text-red-800 font-semibold mb-2">Error Loading Museums</h2>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button 
            onClick={loadMuseums} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
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
              You need to create at least one museum before adding artworks.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/admin/museum/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Create Museum
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
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
            <span>Add New Artwork</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Artwork</h1>
          <p className="text-gray-600 mt-2">
            Add a new artwork to your museum collection with detailed information and curator notes.
          </p>
        </div>

        <ArtworkForm 
          museums={museums}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={false}
        />
      </div>
    </div>
  );
}