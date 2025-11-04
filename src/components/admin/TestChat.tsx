//C:\Users\Vishav\Desktop\New folder (6)\docent\src\components\admin\TestChat.tsx
'use client'

import { useState } from 'react'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { TransitionIndicator } from '@/components/chat/TransitionIndicator'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useTransition } from '@/hooks/useTransition'
import type { Artwork } from '@/types/artwork'
import { RefreshCw, Zap } from 'lucide-react'

interface TestChatProps {
  artworks: Artwork[]
}

export function TestChat({ artworks }: TestChatProps) {
  const [selectedArtwork, setSelectedArtwork] = useState<string | null>(null)
  const transition = useTransition()

  const handleArtworkSelect = (artworkId: string) => {
    setSelectedArtwork(artworkId)
    transition.enqueue(artworkId)
  }

  const handleForceTransition = () => {
    transition.forceTransition()
  }

  const handleClearQueue = () => {
    transition.clearQueue()
  }

  const selectedArtworkData = artworks.find(a => a.id === selectedArtwork)

  return (
    <div className="space-y-8">
      {/* Debug Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Transition Controls</h2>
          <div className="flex space-x-2">
            <Button
              onClick={handleForceTransition}
              size="sm"
              variant="outline"
              disabled={!transition.next}
            >
              <Zap className="w-4 h-4 mr-1" />
              Force Transition
            </Button>
            <Button
              onClick={handleClearQueue}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Clear Queue
            </Button>
          </div>
        </div>

        <TransitionIndicator
          current={transition.current}
          next={transition.next}
          isTransitioning={transition.isTransitioning}
          currentArtworkTitle={selectedArtworkData?.title}
          nextArtworkTitle={artworks.find(a => a.id === transition.next)?.title}
        />

        {/* Debug Info */}
        <details className="mt-4">
          <summary className="text-sm font-medium cursor-pointer text-gray-600">
            Debug Information
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify(transition.getQueueStatus?.(), null, 2)}
          </pre>
        </details>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Artwork Selection */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Select Artwork</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {artworks.map((artwork) => (
                <div
                  key={artwork.id}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedArtwork === artwork.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleArtworkSelect(artwork.id)}
                >
                  <h3 className="font-medium text-sm">{artwork.title}</h3>
                  <p className="text-xs text-gray-600">{artwork.artist}</p>
                  {artwork.year && (
                    <p className="text-xs text-gray-500">{artwork.year}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          {selectedArtwork ? (
            <Card className="h-[600px]">
              <ChatInterface artworkId={selectedArtwork} />
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">💬</span>
                </div>
                <p className="text-lg font-medium mb-2">No Artwork Selected</p>
                <p className="text-sm">
                  Choose an artwork from the list to start testing the chat interface.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
