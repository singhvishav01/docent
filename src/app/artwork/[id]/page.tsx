// src/app/artwork/[id]/page.tsx - WITH PERSISTENT FLOATING CHAT
'use client';

import { notFound, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PersistentChatInterface } from '@/components/chat/PersistentChatInterface';
import { QRScannerModal } from '@/components/qr/QRScannerModal';
import { FloatingScanButton } from '@/components/qr/FloatingScanButton';
import { TransitionIndicator } from '@/components/chat/TransitionIndicator';
import { useTransition } from '@/hooks/useTransition';
import { useArtwork } from '@/contexts/ArtworkContext';
import { useVisitorGate } from '@/hooks/useVisitorGate';

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
  const [showDetails, setShowDetails] = useState(false);

  const transition = useTransition();
  const { setCurrentArtwork } = useArtwork();
  const { requireIdentity } = useVisitorGate();
  const [gateCleared, setGateCleared] = useState(false);

  // Gate check runs once on mount only
  useEffect(() => {
    requireIdentity().then(() => setGateCleared(true));
  }, []);

  // Artwork loads when gate clears, or when artworkId/museumId changes after gate
  useEffect(() => {
    if (gateCleared) loadArtwork(artworkId, museumId);
  }, [artworkId, museumId, gateCleared]);

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

  // Publish current artwork (including full data) to context so PersistentChatInterface
  // can read it directly — eliminates the N×3 duplicate fetches from mounted instances
  useEffect(() => {
    if (artwork) {
      setCurrentArtwork(artworkId, museumId, artwork.title, artwork.artist, artwork.year, artwork);
    }
  }, [artwork, artworkId, museumId, setCurrentArtwork]);

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
        setNextArtworkInfo({ id: nextId, title: data.artwork.title });
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

  const handleQRDetected = async (scannedArtworkId: string) => {
    try {
      console.log('[ArtworkPage] QR Code detected - Artwork ID:', scannedArtworkId);
      const newArtworkId = scannedArtworkId.trim();

      if (!newArtworkId) {
        alert('Invalid QR code - empty content');
        return;
      }

      setScannerOpen(false);

      if (newArtworkId === artworkId) {
        console.log('[ArtworkPage] Same artwork, ignoring');
        return;
      }

      try {
        const lookupResponse = await fetch(`/api/artworks/lookup/${newArtworkId}`);
        if (!lookupResponse.ok) {
          alert(`Artwork "${newArtworkId}" not found. Please try scanning again.`);
          return;
        }

        const artworkInfo = await lookupResponse.json();
        const correctMuseum = artworkInfo.museum;

        const verifyResponse = await fetch(`/api/artworks/${newArtworkId}?museum=${correctMuseum}`);
        if (!verifyResponse.ok) {
          alert('Error loading artwork. Please try again.');
          return;
        }
      } catch (error) {
        console.error('[ArtworkPage] Error looking up artwork:', error);
        alert('Error loading artwork. Please try again.');
        return;
      }

      console.log('[ArtworkPage] Queueing transition to:', newArtworkId);
      transition.enqueue(newArtworkId);
    } catch (error) {
      console.error('[ArtworkPage] Error handling QR code:', error);
      alert('Error processing QR code. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0A07', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '1px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.5)' }}>LOADING</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!artwork) {
    notFound();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0A07', display: 'flex', flexDirection: 'column' }}>
      {/* ==================== HEADER ==================== */}
      <header style={{ background: 'rgba(13,10,7,0.95)', borderBottom: '1px solid rgba(201,168,76,0.12)', position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Raleway', sans-serif", fontSize: '11px', letterSpacing: '0.05em', color: 'rgba(242,232,213,0.35)' }}>
            <a href="/" style={{ color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.3em' }}>WINSTON</a>
            <span>›</span>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{museumId}</span>
            <span>›</span>
            <span style={{ color: 'rgba(242,232,213,0.7)', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", fontSize: '14px' }}>{artwork.title}</span>
          </div>

          {/* Scan button */}
          <button
            onClick={() => setScannerOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 18px', background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.25)', cursor: 'pointer',
              fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em',
              color: 'rgba(201,168,76,0.7)', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#C9A84C'; e.currentTarget.style.color = '#0D0A07'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.1)'; e.currentTarget.style.color = 'rgba(201,168,76,0.7)'; }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            SCAN NEXT
          </button>
        </div>
      </header>

      {/* ==================== TRANSITION INDICATOR ==================== */}
      {transition.next && (
        <div style={{ position: 'sticky', top: '53px', zIndex: 20, background: 'rgba(13,10,7,0.9)', borderBottom: '1px solid rgba(201,168,76,0.1)', backdropFilter: 'blur(8px)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '8px 24px' }}>
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

      {/* ==================== MAIN CONTENT ==================== */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', maxWidth: '1280px', margin: '0 auto' }}>

          {/* ========== MOBILE LAYOUT (< 768px) ========== */}
          <div className="md:hidden h-full flex flex-col">
            {/* Compact Artwork Header */}
            <div style={{ background: 'rgba(242,232,213,0.03)', padding: '16px', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '96px', height: '96px', flexShrink: 0, overflow: 'hidden', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  {artwork.image_url ? (
                    <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="32" height="32" fill="none" stroke="rgba(201,168,76,0.3)" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 400, fontStyle: 'italic', color: '#F2E8D5', marginBottom: '4px', lineHeight: 1.2 }}>{artwork.title}</h2>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(242,232,213,0.6)', letterSpacing: '0.05em' }}>{artwork.artist}</p>
                  {artwork.year && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', color: 'rgba(201,168,76,0.5)', marginTop: '4px', letterSpacing: '0.1em' }}>{artwork.year}</p>}
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    style={{ marginTop: '8px', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {showDetails ? 'HIDE' : 'SHOW'} DETAILS
                    <svg style={{ width: '10px', height: '10px', transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              {showDetails && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
                  {artwork.medium && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>MEDIUM</span>
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(242,232,213,0.5)', marginTop: '2px' }}>{artwork.medium}</p>
                    </div>
                  )}
                  {artwork.dimensions && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>DIMENSIONS</span>
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(242,232,213,0.5)', marginTop: '2px' }}>{artwork.dimensions}</p>
                    </div>
                  )}
                  {artwork.description && (
                    <div>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>DESCRIPTION</span>
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(242,232,213,0.4)', lineHeight: 1.7, marginTop: '4px' }}>{artwork.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Chat */}
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
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2px', padding: '16px' }}>
              <div style={{ background: 'rgba(242,232,213,0.03)', border: '1px solid rgba(201,168,76,0.1)', padding: '20px', display: 'flex', gap: '20px' }}>
                <div style={{ width: '192px', height: '192px', flexShrink: 0, overflow: 'hidden', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  {artwork.image_url ? (
                    <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="48" height="48" fill="none" stroke="rgba(201,168,76,0.3)" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 300, fontStyle: 'italic', color: '#F2E8D5', marginBottom: '8px', lineHeight: 1.2 }}>{artwork.title}</h1>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(242,232,213,0.6)', marginBottom: '16px', letterSpacing: '0.05em' }}>{artwork.artist}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {artwork.year && (
                      <div>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>YEAR</span>
                        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(242,232,213,0.6)', marginTop: '2px' }}>{artwork.year}</p>
                      </div>
                    )}
                    {artwork.medium && (
                      <div>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>MEDIUM</span>
                        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(242,232,213,0.6)', marginTop: '2px' }}>{artwork.medium}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    style={{ marginTop: '12px', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {showDetails ? 'HIDE' : 'SHOW'} FULL DETAILS
                  </button>
                </div>
              </div>
              {showDetails && (
                <div style={{ background: 'rgba(242,232,213,0.03)', border: '1px solid rgba(201,168,76,0.1)', padding: '20px' }}>
                  {artwork.description && (
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', marginBottom: '8px' }}>DESCRIPTION</h3>
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(242,232,213,0.5)', lineHeight: 1.7 }}>{artwork.description}</p>
                    </div>
                  )}
                  {artwork.dimensions && (
                    <div>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>DIMENSIONS</span>
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(242,232,213,0.5)', marginTop: '2px' }}>{artwork.dimensions}</p>
                    </div>
                  )}
                </div>
              )}
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.1)' }}>
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

          {/* ========== DESKTOP LAYOUT (> 1024px) — artwork only, chat is the floating widget ========== */}
          <div className="hidden lg:block h-full overflow-y-auto" style={{ padding: '32px 24px' }}>
            <div style={{ maxWidth: '768px', margin: '0 auto' }}>
              {/* Image */}
              <div style={{ background: 'rgba(242,232,213,0.03)', border: '1px solid rgba(201,168,76,0.12)', overflow: 'hidden', marginBottom: '2px', textAlign: 'center' }}>
                {artwork.image_url ? (
                  <img
                    src={artwork.image_url}
                    alt={artwork.title}
                    style={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <div style={{ padding: '80px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="64" height="64" fill="none" stroke="rgba(201,168,76,0.2)" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Details */}
              <div style={{ background: 'rgba(242,232,213,0.03)', border: '1px solid rgba(201,168,76,0.12)', borderTop: 'none', padding: '32px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '36px', fontWeight: 300, fontStyle: 'italic', color: '#F2E8D5', marginBottom: '8px', lineHeight: 1.1 }}>{artwork.title}</h1>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '15px', color: 'rgba(242,232,213,0.6)', letterSpacing: '0.05em' }}>{artwork.artist}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', paddingTop: '24px', paddingBottom: '24px', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)', marginBottom: '24px' }}>
                  {artwork.year && (
                    <div>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.5)', display: 'block', marginBottom: '4px' }}>YEAR</span>
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(242,232,213,0.7)' }}>{artwork.year}</p>
                    </div>
                  )}
                  {artwork.medium && (
                    <div>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.5)', display: 'block', marginBottom: '4px' }}>MEDIUM</span>
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(242,232,213,0.7)' }}>{artwork.medium}</p>
                    </div>
                  )}
                  {artwork.dimensions && (
                    <div>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.5)', display: 'block', marginBottom: '4px' }}>DIMENSIONS</span>
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(242,232,213,0.7)' }}>{artwork.dimensions}</p>
                    </div>
                  )}
                  {artwork.gallery && (
                    <div>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.5)', display: 'block', marginBottom: '4px' }}>GALLERY</span>
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(242,232,213,0.7)' }}>{artwork.gallery}</p>
                    </div>
                  )}
                </div>

                {artwork.description && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', marginBottom: '12px' }}>DESCRIPTION</h3>
                    <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', fontWeight: 300, color: 'rgba(242,232,213,0.55)', lineHeight: 1.8 }}>{artwork.description}</p>
                  </div>
                )}

                {artwork.curator_notes && artwork.curator_notes.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: '24px' }}>
                    <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', marginBottom: '16px' }}>CURATOR NOTES</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {artwork.curator_notes.map((note: any, index: number) => (
                        <div key={index} style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)', padding: '16px' }}>
                          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(242,232,213,0.6)', lineHeight: 1.7, marginBottom: '8px' }}>{note.note}</p>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(201,168,76,0.4)' }}>
                            — {note.author} · {new Date(note.date).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Mobile/Tablet floating scan button (desktop uses header button) */}
      <div className="lg:hidden">
        <FloatingScanButton
          onClick={() => setScannerOpen(true)}
          isScanning={scannerOpen}
        />
      </div>

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
