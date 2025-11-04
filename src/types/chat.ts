export interface Message {
  id: string
  sessionId: string
  artworkId: string
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    sources?: string[]
    isSpeculative?: boolean
    grounding?: string
    transitionInfo?: {
      from: string | null
      to: string
    }
  }
  createdAt: Date
}

export interface ChatSession {
  id: string
  userId?: string
  artworkId: string
  title?: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
}

// src/types/location.ts
export interface LocationData {
  artworkId: string
  timestamp: number
  source: 'qr' | 'ble' | 'manual'
  metadata?: Record<string, any>
}

export interface LocationProvider {
  initialize(): Promise<void>
  getCurrentLocation(): Promise<string | null>
  onLocationChange(callback: (artworkId: string) => void): void
  cleanup(): void
}