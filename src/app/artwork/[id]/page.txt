// src/app/artwork/[id]/page.tsx - ENHANCED VERSION
'use client';

import { notFound, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ArtworkDisplay from '@/components/ArtworkDisplay';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { QRScannerModal } from '@/components/qr/QRScannerModal';
import { FloatingScanButton } from '@/components/qr/FloatingScanButton';
import { TransitionIndicator } from '@/components/chat/TransitionIndicator';
import { useTransition } from '@/hooks/useTransition';


interface ArtworkPageProps {
  params: { id: string };
  searchParams: { museum?: string };
}

export default function ArtworkPage({ params, searchParams }: ArtworkPageProps) {
  const router = useRouter();
  const artworkId = params.id;
  const museumId = searchParams.museum || 'met';
  
  const [artwork, setArtwork] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [nextArtworkInfo, setNextArtworkInfo] = useState<{ id: string; title: string } | null>(null);
  
  const transition = useTransition();

  // Load current artwork
  useEffect(() => {
    loadArtwork(artworkId, museumId);
  }, [artworkId, museumId]);

  // Load next artwork info when queued
  useEffect(() => {
    if (transition.next && transition.next !== artworkId) {
      loadNextArtworkInfo(transition.next, museumId);
    } else {
      setNextArtworkInfo(null);
    }
  }, [transition.next, artworkId, museumId]);

  // Handle automatic transition
  useEffect(() => {
    // Set up transition callback
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
      // Navigate to new artwork with smooth transition
      if (event.to && event.to !== artworkId) {
        // Show transition indicator briefly
        setTimeout(() => {
          router.push(`/artwork/${event.to}?museum=${museumId}`);
        }, 500);
      }
    };

    // Set up the transition callback
    transition.setOnTransition?.(handleTransition);

    return () => {
      // Cleanup if needed
    };
  };

  const handleQRDetected = async (qrContent: string) => {
    try {
      console.log('QR Code detected:', qrContent);
      
      // Parse QR code content
      let newArtworkId: string;
      let newMuseumId: string = museumId;
      
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(qrContent);
        newArtworkId = parsed.artworkId || parsed.id;
        newMuseumId = parsed.museum || museumId;
      } catch {
        // Try parsing as URL
        try {
          const url = new URL(qrContent);
          const pathParts = url.pathname.split('/');
          newArtworkId = pathParts[pathParts.length - 1];
          newMuseumId = url.searchParams.get('museum') || museumId;
        } catch {
          // Assume it's just the artwork ID
          newArtworkId = qrContent.trim();
        }
      }

      if (!newArtworkId) {
        console.error('Could not parse artwork ID from QR code');
        return;
      }

      console.log('Parsed artwork ID:', newArtworkId, 'Museum:', newMuseumId);

      // Close scanner
      setScannerOpen(false);

      // If same artwork, ignore
      if (newArtworkId === artworkId) {
        console.log('Same artwork, ignoring');
        return;
      }

      // Verify artwork exists before adding to queue
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

      // Add to transition queue
      transition.enqueue(newArtworkId);
      
      console.log('Artwork queued for transition:', newArtworkId);

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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <a href="/" className="hover:text-blue-600">Home</a>
              <span>→</span>
              <a href="/museums" className="hover:text-blue-600">Museums</a>
              <span>→</span>
              <span className="capitalize">{museumId}</span>
              <span>→</span>
              <span className="text-gray-900 font-medium truncate max-w-[200px]">
                {artwork.title}
              </span>
            </div>

            {/* Desktop Scan Button */}
            <button
              onClick={() => setScannerOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan Next
            </button>
          </nav>
        </div>
      </header>

      {/* Transition Indicator */}
      {transition.next && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <TransitionIndicator
            current={artworkId}
            next={transition.next}
            isTransitioning={transition.isTransitioning}
            currentArtworkTitle={artwork.title}
            nextArtworkTitle={nextArtworkInfo?.title}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Artwork Details */}
          <div className="space-y-6">
            <ArtworkDisplay artwork={artwork} />
          </div>

          {/* Right Column - Chat Interface */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-lg shadow-lg">
              <ChatInterface 
                artworkId={artworkId}
                museumId={museumId}
                artworkTitle={artwork.title}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Floating Scan Button - Mobile & Desktop */}
      <FloatingScanButton 
        onClick={() => setScannerOpen(true)}
        isScanning={scannerOpen}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onQRDetected={handleQRDetected}
        currentArtworkId={artworkId}
      />
    </div>
  );
}