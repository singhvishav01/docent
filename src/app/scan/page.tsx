'use client'

import { QRScannerPanel } from '@/components/qr/QRScanner'
import { ManualInput } from '@/components/qr/ManualInput'
import { Card } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()

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
              onQRCodeDetected={(qrContent) => {
                // Parse QR content like the original
                let artworkId: string
                try {
                  const parsed = JSON.parse(qrContent)
                  artworkId = parsed.artworkId || parsed.id
                } catch {
                  artworkId = qrContent.trim()
                }
                
                // Navigate to artwork page
                router.push(`/artwork/${encodeURIComponent(artworkId)}`)
              }}
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
        </div>
      </div>
    </div>
  )
}