'use client';

import { Eye, EyeOff, FileText } from 'lucide-react';

interface SourceToggleProps {
  showSources: boolean;
  onToggle: (show: boolean) => void;
  curatorNotesCount: number;
}

export function SourceToggle({ showSources, onToggle, curatorNotesCount }: SourceToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {curatorNotesCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          <FileText className="w-3 h-3" />
          <span>{curatorNotesCount} notes</span>
        </div>
      )}
      <button
        onClick={() => onToggle(!showSources)}
        className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
          showSources 
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title={showSources ? 'Hide source information' : 'Show source information'}
      >
        {showSources ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        <span>{showSources ? 'Hide' : 'Show'} Context</span>
      </button>
    </div>
  );
}
