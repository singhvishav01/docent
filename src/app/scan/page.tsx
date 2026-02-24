'use client'

import { QRScannerPanel } from '@/components/qr/QRScanner'
import { ManualInput } from '@/components/qr/ManualInput'
import { Card } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()

  const handleQRDetected = async (artworkId: string) => {
    console.log('[ScanPage] QR detected - Artwork ID:', artworkId)
    
    try {
      // Step 1: Lookup the artwork to find which museum it belongs to
      const lookupResponse = await fetch(`/api/artworks/lookup/${encodeURIComponent(artworkId)}`)
      
      if (!lookupResponse.ok) {
        console.error('[ScanPage] Artwork not found:', artworkId)
        alert(`Artwork "${artworkId}" not found in any museum. Please check the QR code.`)
        return
      }

      const artworkInfo = await lookupResponse.json()
      const museum = artworkInfo.museum
      
      console.log('[ScanPage] Found artwork in museum:', museum)

      // Step 2: Navigate to the artwork page with the correct museum
      router.push(`/artwork/${encodeURIComponent(artworkId)}?museum=${museum}`)
      
    } catch (error) {
      console.error('[ScanPage] Error loading artwork:', error)
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
              <li>• System automatically detects which museum the artwork belongs to</li>
              <li>• Simply scan to view - no need to select a museum!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}