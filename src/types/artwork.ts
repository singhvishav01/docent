export interface Artwork {
  id: string
  title: string
  artist: string
  year?: number
  medium?: string
  dimensions?: string
  description: string
  curatorNotes?: string
  imageUrl?: string
  qrCode: string
  location?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}