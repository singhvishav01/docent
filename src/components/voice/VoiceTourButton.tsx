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
    if (isActive) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isInitializing}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
          ${isActive 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
          }
          ${(disabled || isInitializing) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
        `}
      >
        {isInitializing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="hidden sm:inline">Starting...</span>
          </>
        ) : isActive ? (
          <>
            <MicOff className="w-5 h-5" />
            <span className="hidden sm:inline">End Tour</span>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            <span className="hidden sm:inline">Start Voice Tour</span>
          </>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !isInitializing && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none z-50">
          {isActive 
            ? 'Stop voice-guided tour' 
            : 'Start conversing with your AI guide'
          }
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}