'use client';

import { useState } from 'react';
import { MessageCircle, ChevronDown, History } from 'lucide-react';
import { useArtwork } from '@/contexts/ArtworkContext';
import { PersistentChatInterface } from './PersistentChatInterface';

export function FloatingChatWidget() {
  const { activeArtwork } = useArtwork();
  const [isOpen, setIsOpen] = useState(false);

  // Only show on desktop when an artwork is active
  if (!activeArtwork) return null;

  return (
    <div className="hidden lg:block fixed bottom-6 right-6 z-50">
      {isOpen ? (
        /* ── Expanded panel ── */
        <div className="flex flex-col w-[400px] h-[560px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-chat-slide-up">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{activeArtwork.title}</p>
              <p className="text-xs text-gray-500 truncate">{activeArtwork.artist}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-shrink-0 ml-2 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Minimize chat"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Chat body */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <PersistentChatInterface
              artworkId={activeArtwork.artworkId}
              museumId={activeArtwork.museumId}
              artworkTitle={activeArtwork.title}
              artworkArtist={activeArtwork.artist}
              artworkYear={activeArtwork.year}
            />
          </div>

          {/* Chat History footer */}
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-2">
            <button className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors">
              <History className="w-3.5 h-3.5" />
              Chat History
            </button>
          </div>
        </div>
      ) : (
        /* ── Collapsed bubble ── */
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 pl-3 pr-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl transition-all duration-200 hover:shadow-2xl"
          aria-label="Open chat"
        >
          <MessageCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium max-w-[160px] truncate">
            {activeArtwork.title}
          </span>
        </button>
      )}
    </div>
  );
}
