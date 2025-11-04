import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MessageSquare } from 'lucide-react'
import type { Artwork } from '@/types/artwork'
import Image from 'next/image'

interface ArtworkCardProps {
  artwork: Artwork
  onSelect: (artworkId: string) => void
}

export function ArtworkCard({ artwork, onSelect }: ArtworkCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <div
        onClick={() => onSelect(artwork.id)}
        className="block"
      >
        {/* Artwork image */}
        <div className="aspect-[4/3] relative">
          {artwork.imageUrl ? (
            <Image
              src={artwork.imageUrl}
              alt={artwork.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <div className="w-12 h-12 mx-auto mb-2 opacity-50">
                  🎨
                </div>
                <span className="text-xs">No image</span>
              </div>
            </div>
          )}
        </div>

        {/* Artwork info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
            {artwork.title}
          </h3>
          <p className="text-sm text-gray-600 mb-2">{artwork.artist}</p>
          {artwork.year && (
            <p className="text-xs text-gray-500 mb-3">{artwork.year}</p>
          )}
          
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(artwork.id)
            }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Start Chat
          </Button>
        </div>
      </div>
    </Card>
  )
}