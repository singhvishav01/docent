// src/components/voice/VoiceModeIndicator.tsx
'use client';

import { Mic, MicOff, Brain, Volume2 } from 'lucide-react';
import { VoiceMode } from '@/lib/voice/WinstonVoiceManager';

interface VoiceModeIndicatorProps {
  mode: VoiceMode;
  interimTranscript?: string;
}

export function VoiceModeIndicator({ mode, interimTranscript }: VoiceModeIndicatorProps) {
  if (mode === 'dormant') return null;

  const configs: Record<string, { icon: any; label: string; color: string; pulse: boolean }> = {
    listening: { icon: Mic, label: 'LISTENING', color: 'rgba(120,200,120,0.8)', pulse: true },
    thinking:  { icon: Brain, label: 'PROCESSING', color: 'rgba(201,168,76,0.8)', pulse: false },
    speaking:  { icon: Volume2, label: 'SPEAKING', color: 'rgba(180,140,220,0.8)', pulse: true },
    default:   { icon: MicOff, label: 'INACTIVE', color: 'rgba(242,232,213,0.25)', pulse: false },
  };

  const config = configs[mode] ?? configs.default;
  const Icon = config.icon;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'rgba(242,232,213,0.03)', border: '1px solid rgba(201,168,76,0.1)' }}>
      <div style={{ position: 'relative', lineHeight: 0 }}>
        <Icon size={16} color={config.color} />
        {config.pulse && (
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: config.color, opacity: 0.3, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: config.color }}>
          {config.label}
        </div>
        {mode === 'listening' && interimTranscript && (
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', fontStyle: 'italic', color: 'rgba(242,232,213,0.4)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            "{interimTranscript}"
          </div>
        )}
      </div>

      {mode === 'listening' && (
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {[0, 150, 300].map((delay) => (
            <div key={delay} style={{ width: '3px', height: '14px', background: 'rgba(120,200,120,0.6)', animation: 'pulse 1s ease-in-out infinite', animationDelay: `${delay}ms` }} />
          ))}
        </div>
      )}

      <style>{`@keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } } @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>
    </div>
  );
}
