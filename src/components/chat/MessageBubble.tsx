'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: '80%', marginLeft: isUser ? '48px' : 0, marginRight: isUser ? 0 : '48px' }}>
        <div style={{
          padding: '10px 14px',
          background: isUser ? 'rgba(201,168,76,0.15)' : 'rgba(242,232,213,0.04)',
          border: `1px solid ${isUser ? 'rgba(201,168,76,0.3)' : 'rgba(242,232,213,0.08)'}`,
        }}>
          {/* Speculative warning */}
          {isSpeculative && !isUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(201,168,76,0.6)', fontSize: '10px', marginBottom: '6px', fontFamily: "'Cinzel', serif", letterSpacing: '0.1em' }}>
              ⚠ SPECULATIVE
            </div>
          )}

          {/* Message content */}
          <div style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            fontWeight: 300,
            lineHeight: 1.7,
            color: isUser ? 'rgba(201,168,76,0.9)' : 'rgba(242,232,213,0.75)',
            whiteSpace: 'pre-wrap',
            letterSpacing: '0.02em',
          }}>{message.content}</div>

          {/* Sources toggle */}
          {!isUser && message.metadata?.sources && showSources && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
              <button
                onClick={() => setShowSourceDetails(!showSourceDetails)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}
              >
                SOURCES
                {showSourceDetails ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>

              {showSourceDetails && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(242,232,213,0.4)', fontFamily: "'Raleway', sans-serif" }}>
                  <div style={{ background: 'rgba(201,168,76,0.05)', padding: '8px', border: '1px solid rgba(201,168,76,0.1)' }}>
                    {message.metadata.grounding ? (
                      <div>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(201,168,76,0.5)', marginBottom: '4px' }}>GROUNDING</p>
                        <p>{message.metadata.grounding}</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(201,168,76,0.5)', marginBottom: '4px' }}>SOURCES</p>
                        <ul style={{ paddingLeft: '14px', margin: 0 }}>
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
        </div>

        {/* Timestamp */}
        <div style={{ fontSize: '10px', color: 'rgba(242,232,213,0.2)', marginTop: '4px', textAlign: isUser ? 'right' : 'left', fontFamily: "'Cinzel', serif", letterSpacing: '0.1em' }}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
