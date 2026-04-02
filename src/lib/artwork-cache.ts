/**
 * Cached artwork context loader
 *
 * Wraps the two hot Prisma queries (artwork + curator notes) with Next.js
 * unstable_cache, keyed on artworkId + museumId.
 *
 * First request for a given artwork hits Postgres; every subsequent request
 * within the 5-minute window is served from the in-process cache.
 * When a curator updates notes, call revalidateTag('artwork-context') to bust.
 */

import { unstable_cache } from 'next/cache';
import { db } from './db';

export interface CachedArtwork {
  id: string;
  museumId: string;
  title: string;
  artist: string;
  year: number | null;
  medium: string | null;
  dimensions: string | null;
  description: string | null;
  gallery: string | null;
  museum: { id: string; name: string };
}

export interface CachedCuratorNote {
  id: string;
  type: string;
  content: string;
  curatorName: string;
}

export interface CachedArtworkContext {
  artwork: CachedArtwork;
  curatorNotes: CachedCuratorNote[];
}

async function fetchArtworkContext(
  artworkId: string,
  museumId: string
): Promise<CachedArtworkContext | null> {
  const [artwork, curatorNotes] = await Promise.all([
    db.artwork.findFirst({
      where: { id: artworkId, museumId },
      include: { museum: { select: { id: true, name: true } } },
    }),
    db.curatorNote.findMany({
      where: { artworkId, museumId },
      include: { curator: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  if (!artwork) return null;

  return {
    artwork: {
      id: artwork.id,
      museumId: artwork.museumId,
      title: artwork.title,
      artist: artwork.artist,
      year: artwork.year ?? null,
      medium: artwork.medium ?? null,
      dimensions: artwork.dimensions ?? null,
      description: artwork.description ?? null,
      gallery: artwork.gallery ?? null,
      museum: artwork.museum as { id: string; name: string },
    },
    curatorNotes: curatorNotes.map((note: any) => ({
      id: note.id,
      type: note.type ?? 'general',
      content: note.content,
      curatorName: note.curator?.name ?? 'Unknown',
    })),
  };
}

// Cache keyed on [artworkId, museumId] — 5-minute TTL, tagged for manual bust
export const getArtworkContext = unstable_cache(
  fetchArtworkContext,
  ['artwork-context'],
  {
    revalidate: 300,
    tags: ['artwork-context'],
  }
);
