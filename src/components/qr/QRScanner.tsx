'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import { Camera, CameraOff, RotateCcw, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface QRScannerPanelProps {
  onQRCodeDetected: (artworkId: string) => void
  currentArtworkId: string
}

export function QRScannerPanel({ onQRCodeDetected, currentArtworkId }: QRScannerPanelProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader>()
  const streamRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader()
    return () => { cleanup() }
  }, [])

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.stop()
      streamRef.current = null
    }
    readerRef.current = undefined
  }

  const getVideoDevices = async () => {
    try {
      const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices() || []
      setDevices(videoDevices)
      return videoDevices
    } catch {
      return []
    }
  }

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      setError(null)
      await getVideoDevices()
      return true
    } catch (error: any) {
      setHasPermission(false)
      if (error.name === 'NotAllowedError') {
        setError('Camera permission denied. Please enable camera access and refresh the page.')
      } else if (error.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else {
        setError('Failed to access camera. Please check your browser settings.')
      }
      return false
    }
  }

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current) return
    try {
      setIsScanning(true)
      setError(null)
      const videoDevices = devices.length > 0 ? devices : await getVideoDevices()
      const currentDevice = videoDevices[currentDeviceIndex]
      const stream = await readerRef.current.decodeFromVideoDevice(
        currentDevice?.deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleQRCode(result.getText())
          } else if (error && !(error instanceof NotFoundException)) {
            console.error('QR scan error:', error)
          }
        }
      )
      streamRef.current = stream
    } catch {
      setError('Failed to start camera. Please try again.')
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    cleanup()
    setIsScanning(false)
  }

  const switchCamera = async () => {
    if (devices.length <= 1) return
    stopScanning()
    const nextIndex = (currentDeviceIndex + 1) % devices.length
    setCurrentDeviceIndex(nextIndex)
    setTimeout(() => startScanning(), 100)
  }

  const handleQRCode = async (qrContent: string) => {
    if (qrContent === lastScannedCode || isProcessing) return
    try {
      setIsProcessing(true)
      setLastScannedCode(qrContent)
      const artworkId = qrContent.trim()
      if (!artworkId) { toast.error('Invalid QR code'); return }
      if (artworkId === currentArtworkId) { toast.success('Already viewing this artwork'); return }
      toast.success('Artwork found')
      await onQRCodeDetected(artworkId)
    } catch {
      toast.error('Failed to process QR code')
    } finally {
      setIsProcessing(false)
      setTimeout(() => setLastScannedCode(null), 3000)
    }
  }

  const initializeScanner = async () => {
    const ok = await requestCameraPermission()
    if (ok) await startScanning()
  }

  // ── Permission not yet requested ──────────────────────────────────────────
  if (hasPermission === null) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: '64px', height: '64px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Camera size={28} color="rgba(201,168,76,0.4)" />
        </div>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', marginBottom: '8px' }}>CAMERA ACCESS REQUIRED</p>
        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', fontWeight: 300, color: 'rgba(242,232,213,0.35)', marginBottom: '24px', lineHeight: 1.6 }}>
          Enable camera access to scan QR codes for artworks.
        </p>
        <button
          onClick={initializeScanner}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 28px', background: '#C9A84C', border: 'none', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: '#0D0A07', transition: 'background 0.2s ease' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F2E8D5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#C9A84C')}
        >
          <Camera size={14} />
          ENABLE CAMERA
        </button>
      </div>
    )
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: '64px', height: '64px', background: 'rgba(166,123,107,0.08)', border: '1px solid rgba(166,123,107,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CameraOff size={28} color="rgba(166,123,107,0.6)" />
        </div>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(166,123,107,0.7)', marginBottom: '8px' }}>CAMERA ACCESS DENIED</p>
        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', fontWeight: 300, color: 'rgba(242,232,213,0.35)', marginBottom: '24px', lineHeight: 1.6 }}>
          {error || 'Please enable camera access in your browser settings.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 24px', background: 'rgba(242,232,213,0.05)', border: '1px solid rgba(242,232,213,0.15)', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(242,232,213,0.5)' }}
        >
          REFRESH PAGE
        </button>
      </div>
    )
  }

  // ── Scanner active ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Video feed */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '220px', background: '#000', display: 'block', objectFit: 'cover' }}
          playsInline
          muted
        />

        {/* Corner markers */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* top-left */}
          <div style={{ position: 'absolute', top: '8px', left: '8px', width: '20px', height: '20px', borderTop: '2px solid #C9A84C', borderLeft: '2px solid #C9A84C' }} />
          {/* top-right */}
          <div style={{ position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', borderTop: '2px solid #C9A84C', borderRight: '2px solid #C9A84C' }} />
          {/* bottom-left */}
          <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '20px', height: '20px', borderBottom: '2px solid #C9A84C', borderLeft: '2px solid #C9A84C' }} />
          {/* bottom-right */}
          <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '20px', height: '20px', borderBottom: '2px solid #C9A84C', borderRight: '2px solid #C9A84C' }} />
          {/* Centre label */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ background: 'rgba(13,10,7,0.7)', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.8)', padding: '5px 12px', border: '1px solid rgba(201,168,76,0.2)' }}>
              {isProcessing ? 'PROCESSING...' : 'POINT AT QR CODE'}
            </span>
          </div>
        </div>

        {/* Loading overlay */}
        {!isScanning && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,10,7,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '24px', height: '24px', border: '1px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* Success overlay */}
        {isProcessing && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={32} color="#C9A84C" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
        {!isScanning ? (
          <button
            onClick={startScanning}
            disabled={!hasPermission}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: '#C9A84C', border: 'none', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: '#0D0A07', transition: 'background 0.2s ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F2E8D5')}
            onMouseLeave={e => (e.currentTarget.style.background = '#C9A84C')}
          >
            <Camera size={12} />
            START
          </button>
        ) : (
          <button
            onClick={stopScanning}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: 'rgba(242,232,213,0.05)', border: '1px solid rgba(242,232,213,0.15)', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(242,232,213,0.5)', transition: 'all 0.2s ease' }}
          >
            <CameraOff size={12} />
            STOP
          </button>
        )}

        {devices.length > 1 && (
          <button
            onClick={switchCamera}
            style={{ padding: '9px 14px', background: 'rgba(242,232,213,0.04)', border: '1px solid rgba(201,168,76,0.15)', cursor: 'pointer', color: 'rgba(201,168,76,0.5)', lineHeight: 0, transition: 'all 0.2s ease' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)')}
            title="Switch camera"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {isScanning && devices.length > 1 && (
        <p style={{ textAlign: 'center', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(201,168,76,0.3)' }}>
          CAMERA {currentDeviceIndex + 1} / {devices.length}
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
