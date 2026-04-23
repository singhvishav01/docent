'use client'

import { QRScannerPanel } from '@/components/qr/QRScanner'
import { ManualInput } from '@/components/qr/ManualInput'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/nav/BackButton'
import { RecentlyViewed } from '@/components/scan/RecentlyViewed'
import { BottomNavSpacer } from '@/components/nav/BottomNavSpacer'

const S = {
  warmBlack: '#0D0A07',
  agedGold: '#C9A84C',
  parchment: '#F2E8D5',
  cinzel: "'Cinzel', serif",
  cormorant: "'Cormorant Garamond', serif",
  raleway: "'Raleway', sans-serif",
}

export default function ScanPage() {
  const router = useRouter()

  const handleQRDetected = async (artworkId: string) => {
    console.log('[ScanPage] QR detected - Artwork ID:', artworkId)
    try {
      const lookupResponse = await fetch(`/api/artworks/lookup/${encodeURIComponent(artworkId)}`)
      if (!lookupResponse.ok) {
        alert(`Artwork "${artworkId}" not found. Please check the QR code.`)
        return
      }
      const artworkInfo = await lookupResponse.json()
      router.push(`/artwork/${encodeURIComponent(artworkId)}?museum=${artworkInfo.museum}`)
    } catch (error) {
      console.error('[ScanPage] Error:', error)
      alert('Error loading artwork. Please try again.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: S.warmBlack, padding: '60px 24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
            <BackButton fallbackHref="/" />
          </div>
          <p style={{ fontFamily: S.cinzel, fontSize: '10px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.6)', marginBottom: '16px' }}>
            ◆ &nbsp; SCAN ARTWORK &nbsp; ◆
          </p>
          <h1 style={{ fontFamily: S.cormorant, fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 300, color: S.parchment, lineHeight: 1.1, marginBottom: '16px' }}>
            Point. Scan.<br />
            <span style={{ fontStyle: 'italic', color: S.agedGold }}>Discover.</span>
          </h1>
          <p style={{ fontFamily: S.raleway, fontSize: '13px', fontWeight: 300, color: 'rgba(242,232,213,0.45)', letterSpacing: '0.04em', lineHeight: 1.7 }}>
            Point your camera at the QR code next to an artwork. DOCENT will take it from there.
          </p>
        </div>

        {/* Scanner panel */}
        <div style={{
          background: 'rgba(242,232,213,0.03)',
          border: '1px solid rgba(201,168,76,0.15)',
          padding: '32px',
          marginBottom: '24px',
        }}>
          <QRScannerPanel
            onQRCodeDetected={handleQRDetected}
            currentArtworkId=""
          />
        </div>

        {/* Recently viewed */}
        <RecentlyViewed />

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '32px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.1)' }} />
          <span style={{ fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.3)' }}>OR ENTER MANUALLY</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.1)' }} />
        </div>

        {/* Manual input */}
        <div style={{
          background: 'rgba(242,232,213,0.03)',
          border: '1px solid rgba(201,168,76,0.1)',
          padding: '24px 32px',
          marginBottom: '32px',
        }}>
          <ManualInput />
        </div>

        {/* Instructions */}
        <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', paddingTop: '24px' }}>
          <p style={{ fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.4)', marginBottom: '16px' }}>
            HOW IT WORKS
          </p>
          {[
            'QR codes contain the artwork ID',
            'DOCENT automatically finds the museum',
            'No manual museum selection needed',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'flex-start' }}>
              <span style={{ color: S.agedGold, fontSize: '8px', marginTop: '3px', flexShrink: 0 }}>◆</span>
              <span style={{ fontFamily: S.raleway, fontSize: '12px', fontWeight: 300, color: 'rgba(242,232,213,0.4)', letterSpacing: '0.03em' }}>{tip}</span>
            </div>
          ))}
        </div>
        <BottomNavSpacer />
      </div>
    </div>
  )
}
