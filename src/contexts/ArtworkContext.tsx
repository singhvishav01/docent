'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ActiveArtwork {
  artworkId: string;
  museumId: string;
  title: string;
  artist: string;
  year?: number;
  // Full artwork data — populated by ArtworkPage so PersistentChatInterface
  // doesn't need to fetch it separately (prevents N×3 duplicate API calls)
  full?: Record<string, any>;
}

interface ArtworkContextValue {
  activeArtwork: ActiveArtwork | null;
  setCurrentArtwork: (
    artworkId: string,
    museumId: string,
    title: string,
    artist: string,
    year?: number,
    full?: Record<string, any>
  ) => void;
  clearCurrentArtwork: () => void;
}

const ArtworkContext = createContext<ArtworkContextValue | null>(null);

export function ArtworkProvider({ children }: { children: React.ReactNode }) {
  const [activeArtwork, setActiveArtwork] = useState<ActiveArtwork | null>(null);

  const setCurrentArtwork = useCallback((
    artworkId: string,
    museumId: string,
    title: string,
    artist: string,
    year?: number,
    full?: Record<string, any>
  ) => {
    setActiveArtwork({ artworkId, museumId, title, artist, year, full });
  }, []);

  const clearCurrentArtwork = useCallback(() => {
    setActiveArtwork(null);
  }, []);

  return (
    <ArtworkContext.Provider value={{ activeArtwork, setCurrentArtwork, clearCurrentArtwork }}>
      {children}
    </ArtworkContext.Provider>
  );
}

export function useArtwork() {
  const ctx = useContext(ArtworkContext);
  if (!ctx) throw new Error('useArtwork must be used inside ArtworkProvider');
  return ctx;
}
