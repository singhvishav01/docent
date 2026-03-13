'use client';

import { Eye, EyeOff, FileText } from 'lucide-react';

interface SourceToggleProps {
  showSources: boolean;
  onToggle: (show: boolean) => void;
  curatorNotesCount: number;
}

export function SourceToggle({ showSources, onToggle, curatorNotesCount }: SourceToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {curatorNotesCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(201,168,76,0.6)', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', padding: '4px 8px' }}>
          <FileText size={10} />
          <span>{curatorNotesCount}</span>
        </div>
      )}
      <button
        onClick={() => onToggle(!showSources)}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '5px 10px',
          background: showSources ? 'rgba(201,168,76,0.12)' : 'rgba(242,232,213,0.04)',
          border: `1px solid ${showSources ? 'rgba(201,168,76,0.3)' : 'rgba(242,232,213,0.1)'}`,
          cursor: 'pointer',
          fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.15em',
          color: showSources ? 'rgba(201,168,76,0.8)' : 'rgba(242,232,213,0.3)',
          transition: 'all 0.2s ease',
        }}
        title={showSources ? 'Hide source information' : 'Show source information'}
      >
        {showSources ? <EyeOff size={10} /> : <Eye size={10} />}
        <span>{showSources ? 'HIDE' : 'SHOW'}</span>
      </button>
    </div>
  );
}
