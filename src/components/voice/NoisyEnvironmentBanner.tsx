'use client';
import { useEffect, useState } from 'react';

interface Props {
  suggestion: string;
  onDismiss: () => void;
}

export function NoisyEnvironmentBanner({ suggestion, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    const show = setTimeout(() => setVisible(true), 100);
    // Auto-dismiss after 15s
    const hide = setTimeout(() => onDismiss(), 15000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [onDismiss]);

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(166, 123, 107, 0.08)',
        border: '1px solid rgba(166, 123, 107, 0.25)',
        borderRadius: '6px',
        padding: '10px 36px 10px 14px',
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        marginBottom: '8px',
      }}
    >
      <p
        style={{
          fontFamily: 'Raleway, sans-serif',
          fontSize: '12px',
          color: 'rgba(242, 232, 213, 0.8)',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {suggestion}
      </p>
      <button
        onClick={onDismiss}
        style={{
          position: 'absolute',
          top: '8px',
          right: '10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'Cinzel, serif',
          fontSize: '11px',
          color: 'rgba(201, 168, 76, 0.5)',
          padding: 0,
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
