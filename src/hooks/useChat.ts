'use client'

import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    sources?: string[]
    isSpeculative?: boolean
  }
}

interface UseChatProps {
  artworkId: string
  sessionId?: string
}

export function useChat({ artworkId, sessionId }: UseChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artworkId,
          message: content,
          sessionId: currentSessionId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Get session ID from response headers
      const newSessionId = response.headers.get('X-Session-ID')
      if (newSessionId && !currentSessionId) {
        setCurrentSessionId(newSessionId)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error('No response stream')

      let assistantContent = ''
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              break
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantContent += parsed.content
                
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: assistantContent }
                    : msg
                ))
              }
            } catch {
              // Ignore parsing errors for partial chunks
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message. Please try again.')
      
      // Remove the user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }, [artworkId, currentSessionId, isLoading])

  const clearChat = useCallback(() => {
    setMessages([])
    setCurrentSessionId(undefined)
  }, [])

  return {
    messages,
    isLoading,
    sessionId: currentSessionId,
    sendMessage,
    clearChat
  }
}