'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useVisitor } from '@/contexts/VisitorContext';
import { useSession } from '@/contexts/SessionProvider';
import { BackButton } from '@/components/nav/BackButton';
import { BottomNavSpacer } from '@/components/nav/BottomNavSpacer';

const S = {
  bg: '#0D0A07',
  gold: '#C9A84C',
  parchment: '#F2E8D5',
  cinzel: "'Cinzel', serif" as const,
  cormorant: "'Cormorant Garamond', serif" as const,
  raleway: "'Raleway', sans-serif" as const,
};

const DEPTH_OPTIONS: Array<{ value: 'surface' | 'medium' | 'deep'; label: string; desc: string }> = [
  { value: 'surface', label: 'HIGHLIGHTS', desc: 'Key facts and quick takes' },
  { value: 'medium', label: 'BALANCED', desc: 'Context and a bit of depth' },
  { value: 'deep', label: 'DEEP DIVE', desc: 'Full history and analysis' },
];

const PACE_OPTIONS: Array<{ value: 'quick' | 'medium' | 'slow'; label: string; desc: string }> = [
  { value: 'quick', label: 'QUICK', desc: 'Short, punchy responses' },
  { value: 'medium', label: 'RELAXED', desc: 'Conversational pace' },
  { value: 'slow', label: 'LEISURELY', desc: 'Thorough and unhurried' },
];

function EditableField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const handleSave = () => {
    if (draft.trim()) {
      onSave(draft.trim());
    }
    setEditing(false);
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      <p style={{ fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.5)', marginBottom: '10px' }}>
        {label}
      </p>
      {editing ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            placeholder={placeholder}
            style={{
              flex: 1,
              background: 'rgba(242,232,213,0.04)',
              border: '1px solid rgba(201,168,76,0.3)',
              outline: 'none',
              padding: '10px 14px',
              fontFamily: S.raleway,
              fontSize: '14px',
              color: S.parchment,
              letterSpacing: '0.03em',
            }}
          />
          <button
            onClick={handleSave}
            style={{
              padding: '10px 18px',
              background: S.gold,
              border: 'none',
              cursor: 'pointer',
              fontFamily: S.cinzel,
              fontSize: '9px',
              letterSpacing: '0.2em',
              color: S.bg,
              flexShrink: 0,
            }}
          >
            SAVE
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{
              padding: '10px 14px',
              background: 'none',
              border: '1px solid rgba(201,168,76,0.2)',
              cursor: 'pointer',
              fontFamily: S.cinzel,
              fontSize: '9px',
              letterSpacing: '0.2em',
              color: 'rgba(242,232,213,0.4)',
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <p style={{ fontFamily: S.cormorant, fontSize: '20px', fontStyle: 'italic', color: value ? S.parchment : 'rgba(242,232,213,0.25)' }}>
            {value || placeholder}
          </p>
          <button
            onClick={() => { setDraft(value || ''); setEditing(true); }}
            style={{
              background: 'none',
              border: '1px solid rgba(201,168,76,0.2)',
              padding: '6px 14px',
              cursor: 'pointer',
              fontFamily: S.cinzel,
              fontSize: '8px',
              letterSpacing: '0.2em',
              color: 'rgba(201,168,76,0.6)',
              flexShrink: 0,
              transition: 'border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.color = S.gold; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; e.currentTarget.style.color = 'rgba(201,168,76,0.6)'; }}
          >
            EDIT
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { visitorName, docentName, visitorProfile, setVisitorIdentity, setDocentName, updateVisitorProfile, visitorType } = useVisitor();
  const session = useSession();

  // Extract unique visited artworks from session (newest first)
  const visitedArtworks = (() => {
    const seen = new Set<string>();
    const result: Array<{ artworkId: string; title: string; artist: string; year?: number }> = [];
    for (let i = session.messages.length - 1; i >= 0; i--) {
      const msg = session.messages[i];
      if (!seen.has(msg.artworkId) && msg.artworkInfo) {
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
  })();

  const depthPref = visitorProfile?.engagement?.depth_preference ?? 'medium';
  const pacePref = visitorProfile?.engagement?.pace ?? 'medium';

  return (
    <div style={{ minHeight: '100vh', background: S.bg }}>

      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(13,10,7,0.97)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(201,168,76,0.1)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
          <BackButton fallbackHref="/" />
          <span style={{ fontFamily: S.cinzel, fontSize: '10px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.7)' }}>
            SETTINGS
          </span>
          <div style={{ width: '60px' }} /> {/* balance the back button */}
        </div>
      </header>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Identity ── */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '32px', height: '1px', background: 'rgba(201,168,76,0.3)' }} />
            <span style={{ fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.5)' }}>YOUR PROFILE</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.1)' }} />
          </div>

          <EditableField
            label="YOUR NAME"
            value={visitorName}
            placeholder="Enter your name"
            onSave={name => setVisitorIdentity(name, visitorType || 'guest')}
          />

          <EditableField
            label="DOCENT NAME"
            value={docentName}
            placeholder="What should I call your guide?"
            onSave={name => setDocentName(name)}
          />
        </section>

        {/* ── Preferences ── */}
        {visitorProfile && (
          <section style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '32px', height: '1px', background: 'rgba(201,168,76,0.3)' }} />
              <span style={{ fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.5)' }}>PREFERENCES</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.1)' }} />
            </div>

            {/* Depth */}
            <div style={{ marginBottom: '28px' }}>
              <p style={{ fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.5)', marginBottom: '12px' }}>
                DETAIL LEVEL
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {DEPTH_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateVisitorProfile({ engagement: { ...visitorProfile.engagement, depth_preference: opt.value } })}
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      background: depthPref === opt.value ? 'rgba(201,168,76,0.12)' : 'rgba(242,232,213,0.02)',
                      border: `1px solid ${depthPref === opt.value ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.1)'}`,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <p style={{ fontFamily: S.cinzel, fontSize: '7px', letterSpacing: '0.15em', color: depthPref === opt.value ? S.gold : 'rgba(242,232,213,0.35)', marginBottom: '4px' }}>
                      {opt.label}
                    </p>
                    <p style={{ fontFamily: S.raleway, fontSize: '9px', color: 'rgba(242,232,213,0.3)', lineHeight: 1.3 }}>
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Pace */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.5)', marginBottom: '12px' }}>
                RESPONSE PACE
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {PACE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateVisitorProfile({ engagement: { ...visitorProfile.engagement, pace: opt.value } })}
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      background: pacePref === opt.value ? 'rgba(201,168,76,0.12)' : 'rgba(242,232,213,0.02)',
                      border: `1px solid ${pacePref === opt.value ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.1)'}`,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <p style={{ fontFamily: S.cinzel, fontSize: '7px', letterSpacing: '0.15em', color: pacePref === opt.value ? S.gold : 'rgba(242,232,213,0.35)', marginBottom: '4px' }}>
                      {opt.label}
                    </p>
                    <p style={{ fontFamily: S.raleway, fontSize: '9px', color: 'rgba(242,232,213,0.3)', lineHeight: 1.3 }}>
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Visited This Session ── */}
        {visitedArtworks.length > 0 && (
          <section style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '32px', height: '1px', background: 'rgba(201,168,76,0.3)' }} />
              <span style={{ fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.5)' }}>THIS VISIT</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.1)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {visitedArtworks.map((artwork, i) => (
                <Link
                  key={artwork.artworkId}
                  href={`/artwork/${encodeURIComponent(artwork.artworkId)}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      background: 'rgba(242,232,213,0.02)',
                      border: '1px solid rgba(201,168,76,0.08)',
                      transition: 'background 0.2s ease, border-color 0.2s ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(242,232,213,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(242,232,213,0.02)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.08)'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: S.cormorant, fontSize: '16px', fontStyle: 'italic', color: S.parchment, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {artwork.title}
                      </p>
                      <p style={{ fontFamily: S.raleway, fontSize: '11px', color: 'rgba(242,232,213,0.4)', marginTop: '2px' }}>
                        {artwork.artist}{artwork.year ? `, ${artwork.year}` : ''}
                      </p>
                    </div>
                    <svg width="14" height="14" fill="none" stroke="rgba(201,168,76,0.4)" viewBox="0 0 24 24" style={{ flexShrink: 0, marginLeft: '12px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Session info ── */}
        <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
          <p style={{ fontFamily: S.raleway, fontSize: '11px', color: 'rgba(242,232,213,0.2)', letterSpacing: '0.03em', textAlign: 'center' }}>
            {visitedArtworks.length === 0
              ? 'Start exploring — scan a QR code to begin.'
              : `${visitedArtworks.length} artwork${visitedArtworks.length !== 1 ? 's' : ''} explored this session`}
          </p>
        </div>

      </div>

      <BottomNavSpacer />
    </div>
  );
}
