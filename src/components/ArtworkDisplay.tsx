// src/components/ArtworkDisplay.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ArtworkData {
  id: string;
  title: string;
  artist: string;
  year: number;
  medium: string;
  dimensions: string;
  description: string;
  image_url?: string;
  gallery?: string;
  accession_number?: string;
  period?: string;
  culture?: string;
  updated_at?: string;
  curator_notes?: Array<{
    note: string;
    author: string;
    date: string;
  }>;
}

interface ArtworkDisplayProps {
  artwork: ArtworkData;
}

export default function ArtworkDisplay({ artwork }: ArtworkDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Fix hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  const truncateText = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Format dates consistently between server and client
  const formatDate = (dateString: string) => {
    if (!isClient) return ''; // Return empty string during SSR
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString; // Fallback to original string
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Artwork Image */}
      <div className="relative h-64 md:h-80 bg-gray-100 flex items-center justify-center">
        {artwork.image_url && !imageError ? (
          <Image
            src={artwork.image_url}
            alt={artwork.title}
            fill
            className="object-contain"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <div className="text-center p-8">
            <div className="w-20 h-20 mx-auto bg-gray-300 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" 
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">Image not available</p>
          </div>
        )}
      </div>

      {/* Artwork Information */}
      <div className="p-6 space-y-4">
        {/* Title and Artist */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {artwork.title}
          </h1>
          <p className="text-lg text-gray-700 font-medium">
            by {artwork.artist}
          </p>
        </div>

        {/* Basic Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-t border-gray-200">
          <div>
            <span className="text-sm text-gray-500 font-medium">Year</span>
            <p className="text-gray-900">{artwork.year}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500 font-medium">Medium</span>
            <p className="text-gray-900">{artwork.medium}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500 font-medium">Dimensions</span>
            <p className="text-gray-900 text-sm">{artwork.dimensions}</p>
          </div>
          {artwork.gallery && (
            <div>
              <span className="text-sm text-gray-500 font-medium">Gallery</span>
              <p className="text-gray-900">{artwork.gallery}</p>
            </div>
          )}
          {artwork.accession_number && (
            <div>
              <span className="text-sm text-gray-500 font-medium">Accession Number</span>
              <p className="text-gray-900 text-sm">{artwork.accession_number}</p>
            </div>
          )}
          {artwork.period && (
            <div>
              <span className="text-sm text-gray-500 font-medium">Period</span>
              <p className="text-gray-900">{artwork.period}</p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {showFullDescription 
                ? artwork.description 
                : truncateText(artwork.description, 300)
              }
            </p>
            {artwork.description.length > 300 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-flex items-center"
              >
                {showFullDescription ? (
                  <>
                    Show less
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    Read more
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Curator Notes */}
        {artwork.curator_notes && artwork.curator_notes.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Curator Notes</h3>
            <div className="space-y-3">
              {artwork.curator_notes.map((note, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-800 mb-2">{note.note}</p>
                  <div className="text-xs text-gray-500">
                    — {note.author} • {formatDate(note.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Save to favorites
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>

        {/* Last Updated */}
        {artwork.updated_at && (
          <div className="text-xs text-gray-400 border-t border-gray-100 pt-2">
            Last updated: {formatDate(artwork.updated_at)}
          </div>
        )}
      </div>
    </div>
  );
}