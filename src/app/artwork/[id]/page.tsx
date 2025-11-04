// src/app/artwork/[id]/page.tsx
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import ArtworkDisplay from '@/components/ArtworkDisplay';
import { ChatInterface } from '@/components/chat/ChatInterface';

interface ArtworkPageProps {
  params: { id: string };
  searchParams: { museum?: string };
}

async function getArtwork(id: string, museum: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/artworks/${id}?museum=${museum}`;
  
  console.log(`Fetching artwork from: ${url}`);
  
  try {
    const res = await fetch(url, { 
      cache: 'no-store', // Always fetch fresh data for now
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`API Response status: ${res.status}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error: ${res.status} - ${errorText}`);
      
      if (res.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch artwork: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('API Response:', data);
    return data;
    
  } catch (error) {
    console.error('Error in getArtwork:', error);
    throw error;
  }
}

function ArtworkSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-300 rounded w-3/4 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="h-64 bg-gray-300 rounded mb-6"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
        </div>
      </div>
    </div>
  );
}

export default async function ArtworkPage({ params, searchParams }: ArtworkPageProps) {
  const museum = searchParams.museum || 'met'; // Default to 'met' if not specified
  
  console.log(`Page params: id=${params.id}, museum=${museum}`);
  
  let data;
  try {
    data = await getArtwork(params.id, museum);
  } catch (error) {
    console.error('Failed to load artwork page:', error);
    notFound();
  }
  
  if (!data || !data.artwork) {
    console.log('No artwork data found, calling notFound()');
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <a href="/" className="hover:text-blue-600">Home</a>
            <span>→</span>
            <a href="/museums" className="hover:text-blue-600">Museums</a>
            <span>→</span>
            <span className="capitalize">{museum}</span>
            <span>→</span>
            <span className="text-gray-900 font-medium">{data.artwork.title}</span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Artwork Details */}
          <div className="space-y-6">
            <Suspense fallback={<ArtworkSkeleton />}>
              <ArtworkDisplay artwork={data.artwork} />
            </Suspense>
          </div>

          {/* Right Column - Chat Interface */}
          <div className="lg:sticky lg:top-6 h-fit">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Ask about this artwork
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Chat with our AI guide to learn more about "{data.artwork.title}" and its history.
              </p>
              <Suspense fallback={
                <div className="h-96 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading chat...</span>
                </div>
              }>
                <ChatInterface 
                  artworkId={params.id}
                  museumId={museum}
                  artworkTitle={data.artwork.title}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}