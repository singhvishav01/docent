// src/components/voice/VoiceModeIndicator.tsx
'use client';

import { Mic, MicOff, Brain, Volume2 } from 'lucide-react';
import { VoiceMode } from '@/lib/voice/WinstonVoiceManager';

interface VoiceModeIndicatorProps {
  mode: VoiceMode;
  interimTranscript?: string;
}

export function VoiceModeIndicator({ mode, interimTranscript }: VoiceModeIndicatorProps) {
  const getModeConfig = () => {
    switch (mode) {
      case 'listening':
        return {
          icon: Mic,
          label: 'Listening',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          pulse: true
        };
      case 'thinking':
        return {
          icon: Brain,
          label: 'Processing',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          pulse: false
        };
      case 'speaking':
        return {
          icon: Volume2,
          label: 'Speaking',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          pulse: true
        };
      default:
        return {
          icon: MicOff,
          label: 'Inactive',
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          pulse: false
        };
    }
  };

  const config = getModeConfig();
  const Icon = config.icon;

  if (mode === 'dormant') {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      {/* Icon with pulse animation */}
      <div className="relative">
        <Icon className={`w-5 h-5 ${config.color}`} />
        {config.pulse && (
          <span className={`absolute inset-0 rounded-full ${config.bgColor} animate-ping opacity-75`} />
        )}
      </div>

      {/* Status text */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </div>
        
        {/* Show interim transcript while listening */}
        {mode === 'listening' && interimTranscript && (
          <div className="text-xs text-gray-600 italic mt-1 truncate">
            "{interimTranscript}"
          </div>
        )}
      </div>

      {/* Visual indicator */}
      {mode === 'listening' && (
        <div className="flex gap-1">
          <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
      )}
    </div>
  );
}