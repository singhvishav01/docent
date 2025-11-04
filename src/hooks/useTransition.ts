'use client'

import { useEffect, useRef, useState } from 'react'
import { TransitionManager } from '@/lib/transition/TransitionManager'

interface TransitionState {
  current: string | null
  next: string | null
  isTransitioning: boolean
}

export function useTransition() {
  const managerRef = useRef<TransitionManager>()
  const [state, setState] = useState<TransitionState>({
    current: null,
    next: null,
    isTransitioning: false
  })

  useEffect(() => {
    // Initialize transition manager
    const manager = new TransitionManager()
    managerRef.current = manager

    // Set up event handlers
    manager.onTransition((event) => {
      setState(prev => ({
        ...prev,
        current: event.to,
        isTransitioning: true
      }))

      // Clear transitioning state after a brief moment
      setTimeout(() => {
        setState(prev => ({ ...prev, isTransitioning: false }))
      }, 1000)
    })

    manager.onQueueChange((current, next) => {
      setState(prev => ({
        ...prev,
        current,
        next
      }))
    })

    return () => {
      manager.reset()
    }
  }, [])

  const enqueue = (artworkId: string) => {
    managerRef.current?.enqueue(artworkId)
  }

  const forceTransition = () => {
    managerRef.current?.forceTransition()
  }

  const clearQueue = () => {
    managerRef.current?.clearQueue()
  }

  const getQueueStatus = () => {
    return managerRef.current?.getQueueStatus()
  }

  return {
    ...state,
    enqueue,
    forceTransition,
    clearQueue,
    getQueueStatus
  }
}