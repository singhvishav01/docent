// src/components/voice/VoiceTourButton.tsx
'use client';

import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface VoiceTourButtonProps {
  isActive: boolean;
  isInitializing: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function VoiceTourButton({
  isActive,
  isInitializing,
  onStart,
  onStop,
  disabled = false
}: VoiceTourButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (isActive) onStop();
    else onStart();
  };

  const isDisabled = disabled || isInitializing;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 14px',
          background: isActive ? 'rgba(166,60,60,0.3)' : 'rgba(201,168,76,0.1)',
          border: `1px solid ${isActive ? 'rgba(166,60,60,0.4)' : 'rgba(201,168,76,0.2)'}`,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em',
          color: isActive ? 'rgba(220,120,120,0.9)' : 'rgba(201,168,76,0.7)',
          transition: 'all 0.2s ease',
        }}
      >
        {isInitializing ? (
          <>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            <span className="hidden sm:inline">STARTING</span>
          </>
        ) : isActive ? (
          <>
            <MicOff size={14} />
            <span className="hidden sm:inline">END TOUR</span>
          </>
        ) : (
          <>
            <Mic size={14} />
            <span className="hidden sm:inline">VOICE TOUR</span>
          </>
        )}
      </button>

      {showTooltip && !isInitializing && (
        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', padding: '6px 12px', background: 'rgba(13,10,7,0.95)', border: '1px solid rgba(201,168,76,0.2)', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(242,232,213,0.6)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 50 }}>
          {isActive ? 'Stop voice-guided tour' : 'Start conversing with your AI guide'}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
