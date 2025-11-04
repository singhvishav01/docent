'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Camera, CameraOff, RotateCcw, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface QRScannerPanelProps {
  onQRCodeDetected: (qrContent: string) => void
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
    
    return () => {
      cleanup()
    }
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
    } catch (error) {
      console.error('Failed to get video devices:', error)
      return []
    }
  }

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer back camera
      })
      
      // Immediately stop the stream, we just needed to check permission
      stream.getTracks().forEach(track => track.stop())
      
      setHasPermission(true)
      setError(null)
      
      // Get available devices after permission is granted
      await getVideoDevices()
      
      return true
    } catch (error: any) {
      console.error('Camera permission error:', error)
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

      // Get current device or use default
      const videoDevices = devices.length > 0 ? devices : await getVideoDevices()
      const currentDevice = videoDevices[currentDeviceIndex]

      const stream = await readerRef.current.decodeFromVideoDevice(
        currentDevice?.deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const qrContent = result.getText()
            handleQRCode(qrContent)
          } else if (error && !(error instanceof NotFoundException)) {
            console.error('QR scan error:', error)
          }
        }
      )

      streamRef.current = stream
    } catch (error: any) {
      console.error('Scanning error:', error)
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
    
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      startScanning()
    }, 100)
  }

  const handleQRCode = async (qrContent: string) => {
    // Prevent processing the same QR code repeatedly
    if (qrContent === lastScannedCode || isProcessing) return
    
    try {
      setIsProcessing(true)
      setLastScannedCode(qrContent)
      
      // Parse QR code content - expecting artwork ID or JSON with artwork info
      let artworkId: string
      
      try {
        const parsed = JSON.parse(qrContent)
        artworkId = parsed.artworkId || parsed.id
      } catch {
        // Assume it's a direct artwork ID
        artworkId = qrContent.trim()
      }

      if (!artworkId) {
        toast.error('Invalid QR code format')
        return
      }

      // Check if this is the same artwork we're already viewing
      if (artworkId === currentArtworkId) {
        toast.success('Already viewing this artwork')
        return
      }

      toast.success(`Transitioning to new artwork...`)
      
      // Call the parent's handler for seamless transition
      await onQRCodeDetected(qrContent)
      
    } catch (error) {
      console.error('QR code parsing error:', error)
      toast.error('Failed to process QR code')
    } finally {
      setIsProcessing(false)
      
      // Clear the last scanned code after a delay to allow re-scanning
      setTimeout(() => {
        setLastScannedCode(null)
      }, 3000)
    }
  }

  const initializeScanner = async () => {
    const hasPermission = await requestCameraPermission()
    if (hasPermission) {
      await startScanning()
    }
  }

  if (hasPermission === null) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
          <Camera className="w-8 h-8 text-gray-400" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Camera Access Required</h4>
          <p className="text-xs text-gray-600 mb-4">
            Enable camera access to scan QR codes for artwork transitions.
          </p>
          <Button onClick={initializeScanner} size="sm">
            <Camera className="w-4 h-4 mr-2" />
            Enable Camera
          </Button>
        </div>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center">
          <CameraOff className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Camera Access Denied</h4>
          <p className="text-xs text-gray-600 mb-4">
            {error || 'Please enable camera access in your browser settings.'}
          </p>
          <Button onClick={() => window.location.reload()} size="sm">
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-48 bg-black rounded-lg object-cover"
          playsInline
          muted
        />
        
        {/* Scanning overlay */}
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none">
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-blue-400"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-blue-400"></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-blue-400"></div>
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-blue-400"></div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
              {isProcessing ? 'Processing...' : 'Position QR code here'}
            </div>
          </div>
        </div>

        {!isScanning && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <LoadingSpinner className="text-white" />
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-center">
        {!isScanning ? (
          <Button onClick={startScanning} disabled={!hasPermission} size="sm">
            <Camera className="w-4 h-4 mr-1" />
            Start
          </Button>
        ) : (
          <Button onClick={stopScanning} variant="outline" size="sm">
            <CameraOff className="w-4 h-4 mr-1" />
            Stop
          </Button>
        )}

        {devices.length > 1 && (
          <Button onClick={switchCamera} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isScanning && (
        <div className="text-center">
          <p className="text-xs text-gray-600">
            Scan the QR code next to an artwork to transition
          </p>
          {devices.length > 1 && (
            <p className="text-xs text-gray-500 mt-1">
              Camera {currentDeviceIndex + 1}/{devices.length}
            </p>
          )}
        </div>
      )}
    </div>
  )
}