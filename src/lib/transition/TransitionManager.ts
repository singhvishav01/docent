interface QueueItem {
  artworkId: string
  timestamp: number
  processed: boolean
  stale: boolean
}

interface TransitionEvent {
  from: string | null
  to: string
  timestamp: number
}

export class TransitionManager {
  private queue: QueueItem[] = []
  private currentArtwork: string | null = null
  private isProcessing = false
  private readonly maxAge = 30000 // 30 seconds
  private readonly transitionDelay = 2000 // 2 seconds delay after response completion
  
  private onTransitionCallback?: (event: TransitionEvent) => void
  private onQueueChangeCallback?: (current: string | null, next: string | null) => void

  /**
   * Add artwork to transition queue
   * Newer scans invalidate older ones for different artworks
   */
  enqueue(artworkId: string): void {
    const timestamp = Date.now()
    
    // If this is the same artwork as current, ignore
    if (this.currentArtwork === artworkId) {
      return
    }
    
    // Mark existing different artworks as stale
    this.queue.forEach(item => {
      if (item.artworkId !== artworkId && !item.processed) {
        item.stale = true
      }
    })

    // Remove any existing unprocessed items for this same artwork
    this.queue = this.queue.filter(item => 
      item.processed || item.artworkId !== artworkId
    )

    // Add new item
    this.queue.push({ 
      artworkId, 
      timestamp, 
      processed: false, 
      stale: false 
    })
    
    this.cleanupStaleItems()
    this.notifyQueueChange()
    
    // Auto-process after delay if not currently processing
    if (!this.isProcessing) {
      setTimeout(() => this.processQueue(), this.transitionDelay)
    }
  }

  /**
   * Get currently active artwork
   */
  getCurrent(): string | null {
    return this.currentArtwork
  }

  /**
   * Get next artwork in queue (most recent, non-stale)
   */
  getNext(): string | null {
    const nextItem = this.queue
      .filter(item => !item.processed && !item.stale)
      .sort((a, b) => b.timestamp - a.timestamp)[0] // Most recent first
    
    return nextItem ? nextItem.artworkId : null
  }

  /**
   * Get queue status for debugging
   */
  getQueueStatus() {
    return {
      current: this.currentArtwork,
      next: this.getNext(),
      queueLength: this.queue.filter(item => !item.processed && !item.stale).length,
      isProcessing: this.isProcessing,
      queue: this.queue.map(item => ({
        artworkId: item.artworkId,
        processed: item.processed,
        stale: item.stale,
        age: Date.now() - item.timestamp
      }))
    }
  }

  /**
   * Process the transition queue
   * Called automatically after delay or manually
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    const nextItem = this.queue
      .filter(item => !item.processed && !item.stale)
      .sort((a, b) => b.timestamp - a.timestamp)[0]
    
    if (!nextItem) {
      return
    }

    this.isProcessing = true
    
    try {
      const previousArtwork = this.currentArtwork
      this.currentArtwork = nextItem.artworkId
      nextItem.processed = true

      // Create transition event
      const transitionEvent: TransitionEvent = {
        from: previousArtwork,
        to: nextItem.artworkId,
        timestamp: Date.now()
      }

      // Notify transition
      this.onTransitionCallback?.(transitionEvent)
      
      this.cleanupStaleItems()
      this.notifyQueueChange()
      
      // If there are more items in queue, schedule next processing
      const hasMore = this.queue.some(item => !item.processed && !item.stale)
      if (hasMore) {
        setTimeout(() => {
          this.isProcessing = false
          this.processQueue()
        }, this.transitionDelay)
      } else {
        this.isProcessing = false
      }
      
    } catch (error) {
      console.error('Transition processing error:', error)
      this.isProcessing = false
    }
  }

  /**
   * Manually trigger immediate transition (skip delay)
   */
  forceTransition(): void {
    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  /**
   * Clear all pending transitions
   */
  clearQueue(): void {
    this.queue = this.queue.filter(item => item.processed)
    this.notifyQueueChange()
  }

  /**
   * Set transition event handler
   */
  onTransition(callback: (event: TransitionEvent) => void): void {
    this.onTransitionCallback = callback
  }

  /**
   * Set queue change handler for UI updates
   */
  onQueueChange(callback: (current: string | null, next: string | null) => void): void {
    this.onQueueChangeCallback = callback
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.queue = []
    this.currentArtwork = null
    this.isProcessing = false
    this.notifyQueueChange()
  }

  /**
   * Remove old and processed items from queue
   */
  private cleanupStaleItems(): void {
    const now = Date.now()
    this.queue = this.queue.filter(item => {
      // Keep processed items for a short while for debugging
      if (item.processed) {
        return (now - item.timestamp) < 5000 // Keep for 5 seconds
      }
      
      // Remove stale or too old items
      return !item.stale && (now - item.timestamp) < this.maxAge
    })
  }

  /**
   * Notify listeners of queue changes
   */
  private notifyQueueChange(): void {
    this.onQueueChangeCallback?.(this.getCurrent(), this.getNext())
  }
}