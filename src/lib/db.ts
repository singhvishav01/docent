import { PrismaClient } from '@prisma/client'
import type { Artwork } from '@/types/artwork'

declare global {
  var prisma: PrismaClient | undefined
}

export const db = globalThis.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db
}

// Helper function to convert Prisma artwork to interface
function mapPrismaArtworkToInterface(prismaArtwork: any): Artwork {
  return {
    ...prismaArtwork,
    tags: prismaArtwork.tags ? prismaArtwork.tags.split(',').map((tag: string) => tag.trim()) : []
  }
}

// Artwork queries
export async function getArtworkById(id: string): Promise<Artwork | null> {
  try {
    const artwork = await db.artwork.findUnique({
      where: { id }
    })
    if (!artwork) return null
    return mapPrismaArtworkToInterface(artwork)
  } catch (error) {
    console.error('Error fetching artwork:', error)
    return null
  }
}

export async function getArtworkByQRCode(qrCode: string): Promise<Artwork | null> {
  try {
    const artwork = await db.artwork.findUnique({
      where: { qrCode }
    })
    if (!artwork) return null
    return mapPrismaArtworkToInterface(artwork)
  } catch (error) {
    console.error('Error fetching artwork by QR code:', error)
    return null
  }
}

export async function getAllArtworks(): Promise<Artwork[]> {
  try {
    const artworks = await db.artwork.findMany({
      orderBy: { title: 'asc' }
    })
    return artworks.map(mapPrismaArtworkToInterface)
  } catch (error) {
    console.error('Error fetching artworks:', error)
    return []
  }
}

export async function searchArtworks(query: string): Promise<Artwork[]> {
  try {
    const artworks = await db.artwork.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { artist: { contains: query } },
          { description: { contains: query } },
          { tags: { contains: query } }
        ]
      },
      orderBy: { title: 'asc' }
    })
    return artworks.map(mapPrismaArtworkToInterface)
  } catch (error) {
    console.error('Error searching artworks:', error)
    return []
  }
}