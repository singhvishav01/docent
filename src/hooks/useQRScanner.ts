'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

interface QRScannerHook {
  isScanning: boolean
  hasPermission: boolean | null
  error: string | null
  startScanning: () => Promise<void>
  stopScanning: () => void
  requestPermission: () => Promise<boolean>
}

export function useQRScanner(
  videoRef: React.RefObject<HTMLVideoElement>,
  onQRCode: (content: string) => void
): QRScannerHook {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const readerRef = useRef<BrowserMultiFormatReader>()
  const scannerControlsRef = useRef<any | null>(null) // Use correct type if available

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader()
    
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = useCallback(() => {
    if (scannerControlsRef.current) {
      scannerControlsRef.current.stop()
      scannerControlsRef.current = null
    }
    // No need to reset readerRef.current as BrowserMultiFormatReader does not have a reset method
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      })
      stream.getTracks().forEach(track => track.stop())
      
      setHasPermission(true)
      setError(null)
      return true
    } catch (error: any) {
      setHasPermission(false)
      
      if (error.name === 'NotAllowedError') {
        setError('Camera permission denied')
      } else if (error.name === 'NotFoundError') {
        setError('No camera found')
      } else {
        setError('Failed to access camera')
      }
      
      return false
    }
  }, [])

  const startScanning = useCallback(async () => {
    if (!readerRef.current || !videoRef.current) return

    try {
      setIsScanning(true)
      setError(null)

      const controls = await readerRef.current.decodeFromVideoDevice(
        undefined, // Use default camera
        videoRef.current,
        (result, error) => {
          if (result) {
            onQRCode(result.getText())
          }
        }
      )

      scannerControlsRef.current = controls
    } catch (error) {
      setError('Failed to start scanning')
      setIsScanning(false)
    }
  }, [onQRCode, videoRef])

  const stopScanning = useCallback(() => {
    cleanup()
    setIsScanning(false)
  }, [cleanup])

  return {
    isScanning,
    hasPermission,
    error,
    startScanning,
    stopScanning,
    requestPermission
  }
}