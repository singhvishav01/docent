'use client'

import { QRScannerPanel } from '@/components/qr/QRScanner'
import { ManualInput } from '@/components/qr/ManualInput'
import { Card } from '@/components/ui/Card'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const museum = searchParams.get('museum') || 'met'

  const handleQRDetected = async (artworkId: string) => {
    console.log('[ScanPage] QR detected - Artwork ID:', artworkId)
    
    try {
      // Verify the artwork exists before navigating
      const response = await fetch(`/api/artworks/${encodeURIComponent(artworkId)}?museum=${museum}`)
      
      if (response.ok) {
        // Navigate to the artwork page with the museum parameter
        router.push(`/artwork/${encodeURIComponent(artworkId)}?museum=${museum}`)
      } else {
        console.error('[ScanPage] Artwork not found:', artworkId)
        alert(`Artwork "${artworkId}" not found in ${museum}. Please check the QR code.`)
      }
    } catch (error) {
      console.error('[ScanPage] Error verifying artwork:', error)
      alert('Error loading artwork. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Scan Artwork QR Code
            </h1>
            <p className="text-gray-600">
              Point your camera at the QR code next to an artwork to begin your conversation.
            </p>
            {museum !== 'met' && (
              <p className="text-sm text-gray-500 mt-2">
                Museum: <span className="font-medium capitalize">{museum}</span>
              </p>
            )}
          </div>
          
          <Card className="p-8">
            <QRScannerPanel 
              onQRCodeDetected={handleQRDetected}
              currentArtworkId=""
            />
          </Card>
          
          <div className="mt-8">
            <div className="text-center mb-4">
              <span className="text-sm text-gray-500">
                Having trouble with the camera?
              </span>
            </div>
            <Card className="p-6">
              <ManualInput />
            </Card>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📱 How it works:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• QR codes contain the artwork ID (like "washington_crossing")</li>
              <li>• Simply scan the code to view that artwork instantly</li>
              <li>• No need to type or search - just point and scan!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}