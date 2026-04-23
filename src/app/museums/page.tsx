// src/app/museums/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Museum } from '@/lib/rag/types';
import { useVisitorGate } from '@/hooks/useVisitorGate';
import { BottomNavSpacer } from '@/components/nav/BottomNavSpacer';

interface MuseumWithStats extends Museum {
  artworkCount?: number;
}

export default function MuseumsPage() {
  const [museums, setMuseums] = useState<MuseumWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { requireIdentity } = useVisitorGate();

  useEffect(() => {
    requireIdentity().then(() => {
      loadMuseums();
      // Check if user is admin
      fetch('/api/auth/me')
        .then(r => r.ok ? r.json() : null)
        .then(user => { if (user?.role === 'admin') setIsAdmin(true); })
        .catch(() => {});
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const sty = {
    page: { minHeight: '100vh', background: '#0D0A07', padding: '60px 32px' } as React.CSSProperties,
    cinzel: { fontFamily: "'Cinzel', serif" } as React.CSSProperties,
    cormorant: { fontFamily: "'Cormorant Garamond', serif" } as React.CSSProperties,
    raleway: { fontFamily: "'Raleway', sans-serif" } as React.CSSProperties,
  };

  if (loading) {
    return (
      <div style={{ ...sty.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '1px solid rgba(201,168,76,0.4)', borderTopColor: '#C9A84C', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
          <p style={{ ...sty.cinzel, fontSize: '10px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.5)' }}>LOADING MUSEUMS</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...sty.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ ...sty.cinzel, fontSize: '10px', letterSpacing: '0.4em', color: 'rgba(166,123,107,0.7)', marginBottom: '16px' }}>ERROR</p>
          <p style={{ ...sty.raleway, fontSize: '13px', color: 'rgba(242,232,213,0.4)', marginBottom: '32px' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: '#0D0A07', background: '#C9A84C', border: 'none', padding: '12px 32px', cursor: 'pointer' }}
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={sty.page}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '64px' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{ ...sty.cinzel, fontSize: '13px', letterSpacing: '0.4em', color: '#F2E8D5' }}>DOCENT</div>
            <div style={{ ...sty.cinzel, fontSize: '8px', letterSpacing: '0.6em', color: 'rgba(201,168,76,0.6)', marginTop: '2px' }}>MUSEUM DOCENT</div>
          </a>
          <Link href="/scan" style={{ textDecoration: 'none', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: '#0D0A07', background: '#C9A84C', padding: '12px 28px', display: 'inline-block' }}>
            SCAN QR
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          <p style={{ ...sty.cinzel, fontSize: '10px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.6)', marginBottom: '16px' }}>
            ◆ &nbsp; COLLECTIONS &nbsp; ◆
          </p>
          <h1 style={{ ...sty.cormorant, fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 300, color: '#F2E8D5', lineHeight: 1.05, marginBottom: '16px' }}>
            Choose your<br />
            <span style={{ fontStyle: 'italic', color: '#C9A84C' }}>museum.</span>
          </h1>
          <div style={{ width: '64px', height: '1px', background: 'rgba(201,168,76,0.3)' }} />
        </div>

        {/* Grid */}
        {museums.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ ...sty.cinzel, fontSize: '10px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.4)', marginBottom: '12px' }}>NO COLLECTIONS FOUND</p>
            <p style={{ ...sty.raleway, fontSize: '13px', color: 'rgba(242,232,213,0.3)' }}>No museums are currently loaded in the system.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2px' }}>
            {museums.map((museum) => (
              <MuseumCard key={museum.id} museum={museum} isAdmin={isAdmin} />
            ))}
          </div>
        )}
        <BottomNavSpacer />
      </div>
    </div>
  );
}

function MuseumCard({ museum, isAdmin }: { museum: any; isAdmin: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(242,232,213,0.04)' : 'rgba(242,232,213,0.02)',
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.1)'}`,
        padding: '32px',
        transition: 'all 0.25s ease',
      }}
    >
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 300, fontStyle: 'italic', color: '#F2E8D5', lineHeight: 1.2 }}>
          {museum.name}
        </h2>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.4)', flexShrink: 0, marginTop: '4px' }}>
          {museum.id.toUpperCase()}
        </span>
      </div>

      {museum.location && (
        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(242,232,213,0.35)', marginBottom: '12px' }}>
          {museum.location}
        </p>
      )}

      {museum.description && (
        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', fontWeight: 300, color: 'rgba(242,232,213,0.4)', lineHeight: 1.7, marginBottom: '28px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {museum.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <Link
          href={`/scan?museum=${museum.id}`}
          style={{
            flex: 1, fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em',
            color: '#0D0A07', background: '#C9A84C', padding: '11px 16px',
            textDecoration: 'none', textAlign: 'center', display: 'block',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F2E8D5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#C9A84C')}
        >
          START SCANNING
        </Link>
        {isAdmin && (
          <Link
            href={`/admin/test-chat?museum=${museum.id}`}
            style={{
              fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em',
              color: 'rgba(201,168,76,0.5)', background: 'transparent',
              border: '1px solid rgba(201,168,76,0.15)', padding: '11px 16px',
              textDecoration: 'none', display: 'block', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = 'rgba(201,168,76,0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'; e.currentTarget.style.color = 'rgba(201,168,76,0.5)'; }}
          >
            CHAT
          </Link>
        )}
      </div>
    </div>
  );
}