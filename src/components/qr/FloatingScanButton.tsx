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
      style={{
        position: 'fixed', top: '80px', right: '16px', zIndex: 50,
        width: '48px', height: '48px',
        background: isScanning ? '#C9A84C' : 'rgba(201,168,76,0.15)',
        border: `1px solid ${isScanning ? '#C9A84C' : 'rgba(201,168,76,0.3)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transform: isPulsing ? 'scale(0.95)' : 'scale(1)',
        transition: 'all 0.2s ease',
        boxShadow: isScanning ? '0 0 20px rgba(201,168,76,0.3)' : 'none',
      }}
      onMouseEnter={e => { if (!isScanning) e.currentTarget.style.background = 'rgba(201,168,76,0.25)'; }}
      onMouseLeave={e => { if (!isScanning) e.currentTarget.style.background = 'rgba(201,168,76,0.15)'; }}
      title="Scan another artwork"
      aria-label="Scan QR code"
    >
      <Camera
        size={18}
        color={isScanning ? '#0D0A07' : 'rgba(201,168,76,0.8)'}
        style={{ animation: isScanning ? 'pulse 1.5s ease-in-out infinite' : 'none' }}
      />
      {isScanning && (
        <span style={{ position: 'absolute', inset: 0, border: '1px solid rgba(201,168,76,0.4)', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
      )}
      <style>{`@keyframes ping { 75%,100%{transform:scale(1.5);opacity:0} } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </button>
  );
}
