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
  const [debugLog, setDebugLog] = useState<string[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader>()
  const streamRef = useRef<{ stop: () => void } | null>(null)
  const hasManuallySwitch = useRef(false)
  const nextDeviceIndexRef = useRef(0)

  const dbg = (msg: string) => {
    const ts = new Date().toISOString().slice(11, 23)
    console.log(`[QRScanner] ${msg}`)
    setDebugLog(prev => [`${ts} ${msg}`, ...prev].slice(0, 20))
  }

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
      dbg(`Devices(${videoDevices.length}): ${videoDevices.map((d, i) => `[${i}]${d.label || 'no-label'}`).join(' | ')}`)
      return videoDevices
    } catch (e: any) {
      dbg(`listDevices ERR: ${e?.message}`)
      return []
    }
  }

  const requestCameraPermission = async () => {
    try {
      dbg('Requesting permission (environment)')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const track = stream.getVideoTracks()[0]
      dbg(`Permission OK — track: ${track?.label}, facing: ${track?.getSettings?.()?.facingMode}`)
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      setError(null)
      await getVideoDevices()
      return true
    } catch (error: any) {
      dbg(`Permission ERR: ${error?.name} ${error?.message}`)
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

      let deviceId: string | undefined = undefined

      if (hasManuallySwitch.current && videoDevices.length > 0) {
        // User explicitly switched — use the selected device index
        deviceId = videoDevices[nextDeviceIndexRef.current]?.deviceId
        dbg(`Manual switch → idx=${nextDeviceIndexRef.current} id=${deviceId?.slice(0, 12)}`)
      } else if (videoDevices.length > 0) {
        // First scan: try to find back camera by label and update index accordingly.
        // Pass undefined as deviceId so the browser respects the facingMode: 'environment'
        // permission context granted by requestCameraPermission().
        const backIndex = videoDevices.findIndex(d =>
          /back|rear|environment/i.test(d.label)
        )
        if (backIndex >= 0) {
          setCurrentDeviceIndex(backIndex)
          nextDeviceIndexRef.current = backIndex
          dbg(`Back camera found by label at idx=${backIndex}, deviceId=undefined (browser default)`)
        } else {
          dbg(`No back label found — using deviceId=undefined (browser default)`)
        }
        // deviceId stays undefined — let browser pick the back camera
      }

      dbg(`decodeFromVideoDevice(${deviceId ?? 'undefined'})`)
      const stream = await readerRef.current.decodeFromVideoDevice(
        deviceId,
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
      // Log which camera is actually active after stream starts
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getVideoTracks()
        dbg(`Active track: ${tracks[0]?.label}, facing: ${tracks[0]?.getSettings?.()?.facingMode}`)
      }
    } catch (e: any) {
      dbg(`startScanning ERR: ${e?.name} ${e?.message}`)
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
    dbg(`switchCamera: ${devices.length} devices, currently idx=${currentDeviceIndex}`)
    hasManuallySwitch.current = true
    stopScanning()
    // Clear stale srcObject — iOS Safari PWA can hang on a blank frame if this isn't reset
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    const nextIndex = (currentDeviceIndex + 1) % devices.length
    nextDeviceIndexRef.current = nextIndex
    setCurrentDeviceIndex(nextIndex)
    // 300ms gives iOS Safari enough time to fully release the previous camera
    setTimeout(() => startScanning(), 300)
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

      {/* ── On-screen debug log (temp) ───────────────────────────────────────── */}
      {debugLog.length > 0 && (
        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(201,168,76,0.15)', maxHeight: '160px', overflowY: 'auto' }}>
          {debugLog.map((line, i) => (
            <p key={i} style={{ fontFamily: 'monospace', fontSize: '10px', color: i === 0 ? '#C9A84C' : 'rgba(242,232,213,0.45)', margin: '2px 0', wordBreak: 'break-all' }}>
              {line}
            </p>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
