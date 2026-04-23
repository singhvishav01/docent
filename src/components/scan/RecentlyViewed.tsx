'use client';

import Link from 'next/link';
import { useSession } from '@/contexts/SessionProvider';

interface VisitedArtwork {
  artworkId: string;
  title: string;
  artist: string;
  year?: number;
}

function getVisitedArtworks(messages: ReturnType<typeof useSession>['messages']): VisitedArtwork[] {
  const seen = new Set<string>();
  const result: VisitedArtwork[] = [];

  // Walk newest-first so the most recent visit appears first
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (seen.has(msg.artworkId)) continue;
    if (msg.artworkInfo) {
      seen.add(msg.artworkId);
      result.push({
        artworkId: msg.artworkId,
        title: msg.artworkInfo.title,
        artist: msg.artworkInfo.artist,
        year: msg.artworkInfo.year,
      });
    }
  }

  return result;
}

export function RecentlyViewed() {
  const session = useSession();
  const visited = getVisitedArtworks(session.messages);

  if (visited.length === 0) return null;

  return (
    <div style={{ marginBottom: '32px' }}>
      <p style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '9px',
        letterSpacing: '0.4em',
        color: 'rgba(201,168,76,0.5)',
        marginBottom: '16px',
      }}>
        RECENTLY VIEWED
      </p>

      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {visited.map(artwork => (
          <Link
            key={artwork.artworkId}
            href={`/artwork/${encodeURIComponent(artwork.artworkId)}`}
            style={{ textDecoration: 'none', flexShrink: 0 }}
          >
            <div style={{
              width: '140px',
              background: 'rgba(242,232,213,0.03)',
              border: '1px solid rgba(201,168,76,0.12)',
              padding: '14px 12px',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.3)';
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(242,232,213,0.05)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.12)';
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(242,232,213,0.03)';
            }}
            >
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '13px',
                fontStyle: 'italic',
                color: '#F2E8D5',
                lineHeight: 1.3,
                marginBottom: '6px',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {artwork.title}
              </p>
              <p style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '10px',
                color: 'rgba(242,232,213,0.4)',
                letterSpacing: '0.03em',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}>
                {artwork.artist}{artwork.year ? `, ${artwork.year}` : ''}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Hide scrollbar in WebKit */}
      <style>{`.docent-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
