'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    sources?: string[]
    isSpeculative?: boolean
    grounding?: string
  }
}

interface MessageBubbleProps {
  message: Message
  showSources: boolean
}

export function MessageBubble({ message, showSources }: MessageBubbleProps) {
  const [showSourceDetails, setShowSourceDetails] = useState(false)
  const isUser = message.role === 'user'
  const isSpeculative = message.metadata?.isSpeculative

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'ml-12' : 'mr-12'}`}>
        <Card
          className={`p-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {/* Speculative warning */}
          {isSpeculative && !isUser && (
            <div className="flex items-center space-x-1 text-orange-600 text-xs mb-2">
              <AlertTriangle className="w-3 h-3" />
              <span>⚠️ Speculative</span>
            </div>
          )}

          {/* Message content */}
          <div className="whitespace-pre-wrap">{message.content}</div>

          {/* Sources toggle */}
          {!isUser && message.metadata?.sources && showSources && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSourceDetails(!showSourceDetails)}
                className="text-xs p-0 h-auto font-normal text-gray-600 hover:text-gray-800"
              >
                <span className="flex items-center space-x-1">
                  <span>Sources</span>
                  {showSourceDetails ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </Button>

              {showSourceDetails && (
                <div className="mt-2 text-xs text-gray-600">
                  <div className="bg-gray-50 rounded p-2">
                    {message.metadata.grounding ? (
                      <div>
                        <p className="font-medium mb-1">Grounding Information:</p>
                        <p className="text-gray-700">{message.metadata.grounding}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium mb-1">Sources:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {message.metadata.sources.map((source, index) => (
                            <li key={index}>{source}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  )
}

