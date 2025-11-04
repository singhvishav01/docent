export interface TransitionEvent {
  from: string | null
  to: string
  timestamp: number
}

export interface QueueStatus {
  current: string | null
  next: string | null
  queueLength: number
  isProcessing: boolean
  queue: Array<{
    artworkId: string
    processed: boolean
    stale: boolean
    age: number
  }>
}