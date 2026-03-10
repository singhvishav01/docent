'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ActiveArtwork {
  artworkId: string;
  museumId: string;
  title: string;
  artist: string;
  year?: number;
}

interface ArtworkContextValue {
  activeArtwork: ActiveArtwork | null;
  setCurrentArtwork: (artworkId: string, museumId: string, title: string, artist: string, year?: number) => void;
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
    year?: number
  ) => {
    setActiveArtwork({ artworkId, museumId, title, artist, year });
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
