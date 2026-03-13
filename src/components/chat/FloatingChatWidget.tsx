'use client';

import { useState } from 'react';
import { useArtwork } from '@/contexts/ArtworkContext';
import { PersistentChatInterface } from './PersistentChatInterface';

export function FloatingChatWidget() {
  const { activeArtwork } = useArtwork();
  const [isOpen, setIsOpen] = useState(false);

  // Only show on desktop when an artwork is active
  if (!activeArtwork) return null;

  return (
    <div className="hidden lg:block" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50 }}>
      {isOpen ? (
        /* ── Expanded panel ── */
        <div style={{
          display: 'flex', flexDirection: 'column',
          width: '400px', height: '560px',
          background: '#0D0A07',
          border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.06)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(13,10,7,0.95)', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '15px', fontStyle: 'italic', color: '#F2E8D5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{activeArtwork.title}</p>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(242,232,213,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{activeArtwork.artist}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ flexShrink: 0, marginLeft: '8px', padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(201,168,76,0.4)', lineHeight: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.4)')}
              aria-label="Minimize chat"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Chat body */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <PersistentChatInterface
              artworkId={activeArtwork.artworkId}
              museumId={activeArtwork.museumId}
              artworkTitle={activeArtwork.title}
              artworkArtist={activeArtwork.artist}
              artworkYear={activeArtwork.year}
            />
          </div>
        </div>
      ) : (
        /* ── Collapsed bubble ── */
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 20px',
            background: '#C9A84C',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F2E8D5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#C9A84C')}
          aria-label="Open chat"
        >
          <svg width="16" height="16" fill="none" stroke="#0D0A07" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.2em', color: '#0D0A07', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeArtwork.title.toUpperCase()}
          </span>
        </button>
      )}
    </div>
  );
}
