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

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleQRDetected = (qrContent: string) => {
    onQRDetected(qrContent);
    // Don't close modal immediately - let parent handle it
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          ref={modalRef}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan Next Artwork
            </h2>
            <button
              onClick={onClose}
              className="hover:bg-blue-800 p-2 rounded-lg transition-colors"
              aria-label="Close scanner"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scanner Content */}
          <div className="p-6">
            <QRScannerPanel
              onQRCodeDetected={handleQRDetected}
              currentArtworkId={currentArtworkId}
            />
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Point your camera at the QR code next to the artwork
            </p>
          </div>
        </div>
      </div>
    </>
  );
}