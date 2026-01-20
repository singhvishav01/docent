// src/app/museums/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Museum } from '@/lib/rag/types';

interface MuseumWithStats extends Museum {
  artworkCount?: number;
}

export default function MuseumsPage() {
  const [museums, setMuseums] = useState<MuseumWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMuseums();
  }, []);

  const loadMuseums = async () => {
    try {
      console.log('Starting to fetch museums...');
      const response = await fetch('/api/museums');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const museumData = await response.json();
      console.log('Raw museum data:', museumData);
      console.log('Type:', typeof museumData);
      console.log('Is Array?', Array.isArray(museumData));
      
      if (typeof museumData === 'object' && !Array.isArray(museumData)) {
        console.log('Object keys:', Object.keys(museumData));
      }
      
      // Handle different response formats
      let museumsArray: MuseumWithStats[] = [];
      
      if (Array.isArray(museumData)) {
        museumsArray = museumData;
      } else if (museumData && typeof museumData === 'object') {
        // Check if museums are nested in an object
        if (museumData.museums && Array.isArray(museumData.museums)) {
          museumsArray = museumData.museums;
        } else if (museumData.data && Array.isArray(museumData.data)) {
          museumsArray = museumData.data;
        } else {
          console.error('Unexpected data format:', museumData);
        }
      }
      
      console.log('Final museums array:', museumsArray);
      setMuseums(museumsArray);
    } catch (err) {
      console.error('Failed to load museums:', err);
      setError(err instanceof Error ? err.message : 'Failed to load museums');
    } finally {
      setLoading(false);
    }
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
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Explore Museums</h1>
          <p className="text-gray-600 text-lg">
            Discover amazing artworks and collections from world-renowned museums
          </p>
        </div>

        {/* Debug info */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            Debug: Found {museums.length} museums
          </p>
        </div>

        {/* Museums Grid */}
        {museums.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Museums Found</h3>
              <p className="text-gray-600">
                No museums are currently loaded in the system. Check the browser console for details.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {museums.map((museum) => (
              <div key={museum.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 line-clamp-2">
                      {museum.name}
                    </h2>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                      {museum.id}
                    </span>
                  </div>
                  
                  {museum.location && (
                    <p className="text-sm text-gray-500 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {museum.location}
                    </p>
                  )}

                  {museum.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {museum.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Link 
                      href={`/scan?museum=${museum.id}`}
                      className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Start Scanning
                    </Link>
                    <Link 
                      href={`/admin/test-chat?museum=${museum.id}`}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      Test Chat
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}