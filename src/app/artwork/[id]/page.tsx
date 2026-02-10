// src/app/artwork/[id]/page.tsx - WITH PERSISTENT CHAT
'use client';

import { notFound, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { SessionProvider } from '@/contexts/SessionProvider';
import { PersistentChatInterface } from '@/components/chat/PersistentChatInterface';
import { QRScannerModal } from '@/components/qr/QRScannerModal';
import { FloatingScanButton } from '@/components/qr/FloatingScanButton';
import { TransitionIndicator } from '@/components/chat/TransitionIndicator';
import { useTransition } from '@/hooks/useTransition';

interface ArtworkPageProps {
  params: { id: string };
  searchParams: { museum?: string };
}

function ArtworkPageContent({ params, searchParams }: ArtworkPageProps) {
  const router = useRouter();
  const artworkId = params.id;
  const museumId = searchParams.museum || 'met';
  
  const [artwork, setArtwork] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [nextArtworkInfo, setNextArtworkInfo] = useState<{ id: string; title: string } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  const transition = useTransition();

  useEffect(() => {
    loadArtwork(artworkId, museumId);
  }, [artworkId, museumId]);

  useEffect(() => {
    if (transition.next && transition.next !== artworkId) {
      loadNextArtworkInfo(transition.next, museumId);
    } else {
      setNextArtworkInfo(null);
    }
  }, [transition.next, artworkId, museumId]);

  useEffect(() => {
    const unsubscribe = setupTransitionHandler();
    return unsubscribe;
  }, [museumId]);

  const loadArtwork = async (id: string, museum: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/artworks/${id}?museum=${museum}`);
      if (response.ok) {
        const data = await response.json();
        setArtwork(data.artwork);
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Failed to load artwork:', error);
      notFound();
    } finally {
      setLoading(false);
    }
  };

  const loadNextArtworkInfo = async (nextId: string, museum: string) => {
    try {
      const response = await fetch(`/api/artworks/${nextId}?museum=${museum}`);
      if (response.ok) {
        const data = await response.json();
        setNextArtworkInfo({
          id: nextId,
          title: data.artwork.title
        });
      }
    } catch (error) {
      console.error('Failed to load next artwork info:', error);
    }
  };

  const setupTransitionHandler = () => {
    const handleTransition = (event: any) => {
      if (event.to && event.to !== artworkId) {
        setTimeout(() => {
          router.push(`/artwork/${event.to}?museum=${museumId}`);
        }, 500);
      }
    };

    transition.setOnTransition?.(handleTransition);
    return () => {};
  };

  const handleQRDetected = async (qrContent: string) => {
    try {
      console.log('QR Code detected:', qrContent);
      
      let newArtworkId: string;
      let newMuseumId: string = museumId;
      
      try {
        const parsed = JSON.parse(qrContent);
        newArtworkId = parsed.artworkId || parsed.id;
        newMuseumId = parsed.museum || museumId;
      } catch {
        try {
          const url = new URL(qrContent);
          const pathParts = url.pathname.split('/');
          newArtworkId = pathParts[pathParts.length - 1];
          newMuseumId = url.searchParams.get('museum') || museumId;
        } catch {
          newArtworkId = qrContent.trim();
        }
      }

      if (!newArtworkId) {
        console.error('Could not parse artwork ID from QR code');
        return;
      }

      setScannerOpen(false);

      if (newArtworkId === artworkId) {
        console.log('Same artwork, ignoring');
        return;
      }

      try {
        const response = await fetch(`/api/artworks/${newArtworkId}?museum=${newMuseumId}`);
        if (!response.ok) {
          console.error('Artwork not found:', newArtworkId);
          alert('Artwork not found. Please try scanning again.');
          return;
        }
      } catch (error) {
        console.error('Error verifying artwork:', error);
        return;
      }

      transition.enqueue(newArtworkId);
      
    } catch (error) {
      console.error('Error handling QR code:', error);
      alert('Error processing QR code. Please try again.');
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

  if (!artwork) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ==================== HEADER - RESPONSIVE ==================== */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumbs - Hidden on mobile, visible on tablet+ */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <a href="/" className="hover:text-blue-600">Home</a>
              <span>→</span>
              <span className="capitalize">{museumId}</span>
              <span>→</span>
              <span className="text-gray-900 font-medium truncate max-w-[200px]">
                {artwork.title}
              </span>
            </div>

            {/* Mobile: Just title */}
            <div className="md:hidden flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 truncate">
                {artwork.title}
              </h1>
              <p className="text-xs text-gray-600 truncate">{artwork.artist}</p>
            </div>

            {/* Scan Button - Desktop only */}
            <button
              onClick={() => setScannerOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan Next
            </button>
          </div>
        </div>
      </header>

      {/* ==================== TRANSITION INDICATOR ==================== */}
      {transition.next && (
        <div className="sticky top-16 md:top-[68px] z-20 bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <TransitionIndicator
              current={artworkId}
              next={transition.next}
              isTransitioning={transition.isTransitioning}
              currentArtworkTitle={artwork.title}
              nextArtworkTitle={nextArtworkInfo?.title}
            />
          </div>
        </div>
      )}

      {/* ==================== MAIN CONTENT - RESPONSIVE LAYOUTS ==================== */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto">
          
          {/* ========== MOBILE LAYOUT (< 768px) ========== */}
          <div className="md:hidden h-full flex flex-col">
            {/* Compact Artwork Header */}
            <div className="bg-white p-4 border-b">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                  {artwork.image_url ? (
                    <Image
                      src={artwork.image_url}
                      alt={artwork.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-900 mb-1">{artwork.title}</h2>
                  <p className="text-sm text-gray-700">{artwork.artist}</p>
                  {artwork.year && (
                    <p className="text-xs text-gray-500 mt-1">{artwork.year}</p>
                  )}
                  
                  {/* Details Toggle */}
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {showDetails ? 'Hide' : 'Show'} Details
                    <svg className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expandable Details */}
              {showDetails && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 text-sm">
                  {artwork.medium && (
                    <div>
                      <span className="font-medium text-gray-700">Medium:</span>
                      <p className="text-gray-600">{artwork.medium}</p>
                    </div>
                  )}
                  {artwork.dimensions && (
                    <div>
                      <span className="font-medium text-gray-700">Dimensions:</span>
                      <p className="text-gray-600">{artwork.dimensions}</p>
                    </div>
                  )}
                  {artwork.description && (
                    <div>
                      <span className="font-medium text-gray-700">Description:</span>
                      <p className="text-gray-600 text-xs leading-relaxed mt-1">{artwork.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat - Takes remaining space */}
            <div className="flex-1 min-h-0">
              <PersistentChatInterface 
                artworkId={artworkId}
                museumId={museumId}
                artworkTitle={artwork.title}
                artworkArtist={artwork.artist}
                artworkYear={artwork.year}
              />
            </div>
          </div>

          {/* ========== TABLET LAYOUT (768px - 1024px) ========== */}
          <div className="hidden md:block lg:hidden h-full">
            <div className="h-full flex flex-col gap-4 p-4">
              {/* Top: Image & Basic Info */}
              <div className="bg-white rounded-lg shadow-sm p-4 flex gap-4">
                <div className="w-48 h-48 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                  {artwork.image_url ? (
                    <Image
                      src={artwork.image_url}
                      alt={artwork.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{artwork.title}</h1>
                  <p className="text-lg text-gray-700 mb-3">{artwork.artist}</p>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {artwork.year && (
                      <div>
                        <span className="font-medium text-gray-700">Year:</span>
                        <p className="text-gray-600">{artwork.year}</p>
                      </div>
                    )}
                    {artwork.medium && (
                      <div>
                        <span className="font-medium text-gray-700">Medium:</span>
                        <p className="text-gray-600">{artwork.medium}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showDetails ? 'Hide' : 'Show'} Full Details
                  </button>
                </div>
              </div>

              {/* Collapsible Details */}
              {showDetails && (
                <div className="bg-white rounded-lg shadow-sm p-4 space-y-3 text-sm">
                  {artwork.description && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700 leading-relaxed">{artwork.description}</p>
                    </div>
                  )}
                  {artwork.dimensions && (
                    <div>
                      <span className="font-medium text-gray-700">Dimensions:</span>
                      <p className="text-gray-600">{artwork.dimensions}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Chat - Takes remaining height */}
              <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm overflow-hidden">
                <PersistentChatInterface 
                  artworkId={artworkId}
                  museumId={museumId}
                  artworkTitle={artwork.title}
                  artworkArtist={artwork.artist}
                  artworkYear={artwork.year}
                />
              </div>
            </div>
          </div>

          {/* ========== DESKTOP LAYOUT (> 1024px) ========== */}
          <div className="hidden lg:grid lg:grid-cols-2 h-full gap-6 p-6">
            {/* Left Column: Artwork Details */}
            <div className="space-y-6 overflow-y-auto">
              {/* Image */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="aspect-[4/3] relative bg-gray-100">
                  {artwork.image_url ? (
                    <Image
                      src={artwork.image_url}
                      alt={artwork.title}
                      fill
                      className="object-contain"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{artwork.title}</h1>
                  <p className="text-xl text-gray-700 font-medium">{artwork.artist}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-200">
                  {artwork.year && (
                    <div>
                      <span className="text-sm text-gray-500 font-medium">Year</span>
                      <p className="text-gray-900">{artwork.year}</p>
                    </div>
                  )}
                  {artwork.medium && (
                    <div>
                      <span className="text-sm text-gray-500 font-medium">Medium</span>
                      <p className="text-gray-900">{artwork.medium}</p>
                    </div>
                  )}
                  {artwork.dimensions && (
                    <div>
                      <span className="text-sm text-gray-500 font-medium">Dimensions</span>
                      <p className="text-gray-900 text-sm">{artwork.dimensions}</p>
                    </div>
                  )}
                  {artwork.gallery && (
                    <div>
                      <span className="text-sm text-gray-500 font-medium">Gallery</span>
                      <p className="text-gray-900">{artwork.gallery}</p>
                    </div>
                  )}
                </div>

                {artwork.description && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{artwork.description}</p>
                  </div>
                )}

                {artwork.curator_notes && artwork.curator_notes.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Curator Notes</h3>
                    <div className="space-y-3">
                      {artwork.curator_notes.map((note: any, index: number) => (
                        <div key={index} className="bg-blue-50 rounded-lg p-4">
                          <p className="text-gray-800 mb-2">{note.note}</p>
                          <div className="text-xs text-gray-500">
                            — {note.author} • {new Date(note.date).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Chat (Sticky) */}
            <div className="sticky top-24 h-[calc(100vh-7rem)]">
              <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
                <PersistentChatInterface 
                  artworkId={artworkId}
                  museumId={museumId}
                  artworkTitle={artwork.title}
                  artworkArtist={artwork.artist}
                  artworkYear={artwork.year}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ==================== FLOATING SCAN BUTTON - Mobile/Tablet ==================== */}
      <div className="lg:hidden">
        <FloatingScanButton 
          onClick={() => setScannerOpen(true)}
          isScanning={scannerOpen}
        />
      </div>

      {/* ==================== QR SCANNER MODAL ==================== */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onQRDetected={handleQRDetected}
        currentArtworkId={artworkId}
      />
    </div>
  );
}

// Wrap the entire page in SessionProvider
export default function ArtworkPage(props: ArtworkPageProps) {
  return (
    <SessionProvider>
      <ArtworkPageContent {...props} />
    </SessionProvider>
  );
}