// src/components/qr/FloatingScanButton.tsx
'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';

interface FloatingScanButtonProps {
  onClick: () => void;
  isScanning?: boolean;
}

export function FloatingScanButton({ onClick, isScanning = false }: FloatingScanButtonProps) {
  const [isPulsing, setIsPulsing] = useState(false);

  const handleClick = () => {
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 300);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        fixed bottom-6 right-6 z-50
        w-16 h-16 
        bg-gradient-to-br from-blue-600 to-blue-700
        hover:from-blue-700 hover:to-blue-800
        text-white rounded-full shadow-2xl
        flex items-center justify-center
        transition-all duration-300
        ${isPulsing ? 'scale-95' : 'scale-100'}
        ${isScanning ? 'ring-4 ring-blue-300 ring-opacity-50' : 'hover:scale-110'}
      `}
      title="Scan another artwork"
      aria-label="Scan QR code"
    >
      <Camera 
        className={`w-8 h-8 ${isScanning ? 'animate-pulse' : ''}`} 
      />
      
      {/* Ripple effect when active */}
      {isScanning && (
        <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75" />
      )}
    </button>
  );
}