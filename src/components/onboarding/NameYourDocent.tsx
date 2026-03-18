'use client';

import { useState } from 'react';
import { DOCENT_NAMES } from '@/lib/docent/docentNames';

interface NameYourDocentProps {
  visitorName: string | null;
  onSelect: (docentName: string) => void;
}

export function NameYourDocent({ visitorName, onSelect }: NameYourDocentProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selected) onSelect(selected);
  };

  const handleSkip = () => {
    const random = DOCENT_NAMES[Math.floor(Math.random() * DOCENT_NAMES.length)];
    onSelect(random.name);
  };

  return (
    <>
      {/* Eyebrow */}
      <p style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '10px',
        letterSpacing: '0.5em',
        color: 'rgba(201,168,76,0.7)',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        ◆ &nbsp; YOUR GUIDE &nbsp; ◆
      </p>

      {/* Heading */}
      <h2 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 'clamp(24px, 4vw, 34px)',
        fontWeight: 300,
        color: '#F2E8D5',
        lineHeight: 1.15,
        marginBottom: '10px',
        textAlign: 'center',
      }}>
        Before we begin —<br />
        <span style={{ fontStyle: 'italic', color: '#C9A84C' }}>Who will guide you?</span>
      </h2>

      {/* Subtext */}
      <p style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize: '12px',
        fontWeight: 300,
        color: 'rgba(242,232,213,0.38)',
        textAlign: 'center',
        marginBottom: '28px',
        letterSpacing: '0.04em',
        lineHeight: 1.6,
      }}>
        Choose your guide. They will remember your name and your visit.
      </p>

      {/* Name grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginBottom: '24px',
      }}>
        {DOCENT_NAMES.map(({ name, personality }) => {
          const isSelected = selected === name;
          const isHovered = hovered === name && !isSelected;
          return (
            <button
              key={name}
              onClick={() => setSelected(name)}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '14px 12px',
                background: isSelected ? '#C9A84C' : 'rgba(242,232,213,0.03)',
                border: `1px solid ${isSelected ? '#C9A84C' : isHovered ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                borderRadius: '2px',
              }}
            >
              <p style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '12px',
                letterSpacing: '0.15em',
                color: isSelected ? '#0D0A07' : '#F2E8D5',
                marginBottom: '4px',
                fontWeight: isSelected ? 600 : 400,
              }}>
                {name}
              </p>
              <p style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '10px',
                fontStyle: 'italic',
                color: isSelected ? 'rgba(13,10,7,0.6)' : 'rgba(242,232,213,0.3)',
                lineHeight: 1.4,
                letterSpacing: '0.02em',
              }}>
                {personality}
              </p>
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selected}
        style={{
          display: 'block',
          width: '100%',
          padding: '16px',
          background: selected ? '#C9A84C' : 'rgba(201,168,76,0.2)',
          border: 'none',
          cursor: selected ? 'pointer' : 'default',
          fontFamily: "'Cinzel', serif",
          fontSize: '11px',
          letterSpacing: '0.3em',
          color: selected ? '#0D0A07' : 'rgba(201,168,76,0.4)',
          marginBottom: '16px',
          transition: 'all 0.2s ease',
          fontWeight: 600,
          opacity: selected ? 1 : 0.6,
        }}
        onMouseEnter={e => { if (selected) e.currentTarget.style.background = '#F2E8D5'; }}
        onMouseLeave={e => { if (selected) e.currentTarget.style.background = '#C9A84C'; }}
      >
        {selected ? `BEGIN WITH ${selected.toUpperCase()}` : 'SELECT YOUR GUIDE'}
      </button>

      {/* Skip */}
      <button
        onClick={handleSkip}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Raleway', sans-serif",
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: 'rgba(242,232,213,0.2)',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(242,232,213,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(242,232,213,0.2)')}
      >
        Let the app choose for me
      </button>
    </>
  );
}
