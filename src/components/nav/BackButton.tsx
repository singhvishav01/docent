'use client';

import { useRouter } from 'next/navigation';

interface BackButtonProps {
  fallbackHref?: string;
  style?: React.CSSProperties;
}

export function BackButton({ fallbackHref = '/', style }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      onClick={handleBack}
      aria-label="Go back"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 8px',
        minHeight: '44px',
        minWidth: '44px',
        color: 'rgba(201,168,76,0.7)',
        transition: 'color 0.2s ease',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.7)')}
    >
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '9px',
        letterSpacing: '0.2em',
        color: 'inherit',
      }}>
        BACK
      </span>
    </button>
  );
}
