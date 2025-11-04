import { Card } from '@/components/ui/Card'
import { Calendar, User, Ruler, Palette } from 'lucide-react'
import type { Artwork } from '@/types/artwork'
import Image from 'next/image'

interface ArtworkDisplayProps {
  artwork: Artwork
}

export function ArtworkDisplay({ artwork }: ArtworkDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Main artwork image */}
      <Card className="overflow-hidden">
        {artwork.imageUrl ? (
          <div className="aspect-[4/3] relative">
            <Image
              src={artwork.imageUrl}
              alt={artwork.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Image not available</p>
            </div>
          </div>
        )}
      </Card>

      {/* Artwork information */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Title and artist */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {artwork.title}
            </h1>
            <div className="flex items-center text-gray-600">
              <User className="w-4 h-4 mr-2" />
              <span className="text-lg">{artwork.artist}</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {artwork.year && (
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{artwork.year}</span>
              </div>
            )}

            {artwork.medium && (
              <div className="flex items-center text-gray-600">
                <Palette className="w-4 h-4 mr-2" />
                <span>{artwork.medium}</span>
              </div>
            )}

            {artwork.dimensions && (
              <div className="flex items-center text-gray-600 col-span-2">
                <Ruler className="w-4 h-4 mr-2" />
                <span>{artwork.dimensions}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">About this work</h3>
            <p className="text-gray-700 leading-relaxed">{artwork.description}</p>
          </div>

          {/* Curator notes (if available) */}
          {artwork.curatorNotes && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Curator's Notes</h3>
              <p className="text-gray-700 leading-relaxed italic">
                {artwork.curatorNotes}
              </p>
            </div>
          )}

          {/* Location */}
          {artwork.location && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
              <p className="text-gray-600">{artwork.location}</p>
            </div>
          )}

          {/* Tags */}
          {artwork.tags && artwork.tags.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {artwork.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}