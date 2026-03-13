// src/components/qr/QRScannerModal.tsx
'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { QRScannerPanel } from './QRScanner';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQRDetected: (qrContent: string) => void;
  currentArtworkId: string;
}

export function QRScannerModal({
  isOpen,
  onClose,
  onQRDetected,
  currentArtworkId
}: QRScannerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div
          ref={modalRef}
          style={{ background: '#0D0A07', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 24px 60px rgba(0,0,0,0.8)', maxWidth: '512px', width: '100%', maxHeight: '90vh', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(13,10,7,0.95)', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" fill="none" stroke="rgba(201,168,76,0.7)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.3em', color: '#F2E8D5' }}>SCAN NEXT ARTWORK</h2>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(201,168,76,0.4)', padding: '4px', lineHeight: 0, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.4)')}
              aria-label="Close scanner"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scanner Content */}
          <div style={{ padding: '24px' }}>
            <QRScannerPanel
              onQRCodeDetected={onQRDetected}
              currentArtworkId={currentArtworkId}
            />
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(201,168,76,0.08)', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', fontWeight: 300, color: 'rgba(242,232,213,0.3)', letterSpacing: '0.04em' }}>
              Point your camera at the QR code next to the artwork
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
