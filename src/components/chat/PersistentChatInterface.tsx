// src/components/chat/PersistentChatInterface.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { SourceToggle } from './SourceToggle';
import { DocentVoiceManager, VoiceMode } from '@/lib/voice/DocentVoiceManager';
import { VoiceModeIndicator } from '../voice/VoiceModeIndicator';
import { VoiceTourButton } from '../voice/VoiceTourButton';
import { useSession } from '@/contexts/SessionProvider';
import { useVisitor } from '@/contexts/VisitorContext';
import { useArtwork } from '@/contexts/ArtworkContext';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  role: 'user' | 'assistant';
  timestamp: Date;
  artworkId: string;
  artworkInfo?: {
    id: string;
    title: string;
    artist: string;
    year?: number;
  };
  contextUsed?: boolean;
  curatorNotesCount?: number;
}

interface PersistentChatInterfaceProps {
  artworkId: string;
  museumId?: string;
  artworkTitle?: string;
  artworkArtist?: string;
  artworkYear?: number;
}

export function PersistentChatInterface({
  artworkId,
  museumId = 'met',
  artworkTitle,
  artworkArtist,
  artworkYear
}: PersistentChatInterfaceProps) {
  const session = useSession();
  const { visitorName, docentName } = useVisitor();
  const { activeArtwork: contextArtwork } = useArtwork();

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [actualMuseumId, setActualMuseumId] = useState<string>(museumId);

  // Use full artwork from context if available (set by ArtworkPage) to avoid
  // redundant fetches — falls back to local state for standalone usage
  const contextFull = contextArtwork?.artworkId === artworkId ? contextArtwork.full : null;
  const [fetchedArtwork, setFetchedArtwork] = useState<any>(null);
  const currentArtwork = contextFull ?? fetchedArtwork;

  const [voiceMode, setVoiceMode] = useState<VoiceMode>('dormant');
  const [isInitializingVoice, setIsInitializingVoice] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);

  const lastArtworkIdRef = useRef<string>(artworkId);
  const isTransitioningRef = useRef(false);

  const voiceManager = useRef<DocentVoiceManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handleVoiceInputRef = useRef<(text: string) => Promise<void>>(async () => {});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages]);

  useEffect(() => {
    setVoiceSupported(DocentVoiceManager.isSupported());
  }, []);

  useEffect(() => {
    // If ArtworkPage already put the full data in context, use it — no fetch needed
    if (contextFull) {
      setActualMuseumId(contextFull.museumId || museumId);
      return;
    }
    // Fallback: standalone usage (e.g. admin test-chat page) — fetch directly
    const loadArtwork = async () => {
      try {
        const response = await fetch(`/api/artworks/${artworkId}?museum=${museumId}`);
        if (response.ok) {
          const data = await response.json();
          setFetchedArtwork(data.artwork);
          setActualMuseumId(data.museum && data.museum !== museumId ? data.museum : museumId);
        }
      } catch (error) {
        console.error('Failed to load artwork:', error);
      }
    };
    loadArtwork();
  }, [artworkId, museumId, contextFull]);

  useEffect(() => {
    const handleArtworkTransition = async () => {
      if (lastArtworkIdRef.current === artworkId) return;

      const previousArtworkId = lastArtworkIdRef.current;
      lastArtworkIdRef.current = artworkId;

      if (!artworkTitle) return;

      console.log(`[PersistentChat] 🎨 Transition: ${previousArtworkId} → ${artworkId}`);
      isTransitioningRef.current = true;

      try {
        if (voiceManager.current && voiceMode === 'speaking') {
          voiceManager.current.clearQueueKeepCurrent();
          await voiceManager.current.waitForCurrentSentence(4000);
        }

        const lastMessages = session.messages
          .filter(m => m.artworkId === previousArtworkId)
          .slice(-4)
          .map(m => ({ role: m.role, content: m.content }));

        const prevTitle = currentArtwork?.title ?? undefined;
        const prevArtist = currentArtwork?.artist ?? undefined;

        let transitionText: string;
        try {
          const res = await fetch('/api/chat/transition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              previousTitle: prevTitle,
              previousArtist: prevArtist,
              newTitle: artworkTitle,
              newArtist: artworkArtist,
              newYear: artworkYear,
              lastMessages,
            }),
          });
          const data = await res.json();
          transitionText = data.transition;
        } catch {
          transitionText = `Moving on to "${artworkTitle}"${artworkArtist ? ` by ${artworkArtist}` : ''}${artworkYear ? `, ${artworkYear}` : ''}.`;
        }

        const transitionMessage: ChatMessage = {
          id: `transition-${artworkId}-${Date.now()}`,
          content: transitionText,
          isUser: false,
          role: 'assistant',
          timestamp: new Date(),
          artworkId: artworkId,
          artworkInfo: {
            id: artworkId,
            title: artworkTitle,
            artist: artworkArtist || 'Unknown Artist',
            year: artworkYear,
          },
        };
        session.addMessage(transitionMessage);

        if (session.isVoiceTourActive && voiceManager.current) {
          voiceManager.current.enqueueSentence(transitionText);
          voiceManager.current.finalizeQueue();
        }
      } catch (error) {
        console.error('[PersistentChat] ❌ Transition error:', error);
      } finally {
        isTransitioningRef.current = false;
      }
    };

    handleArtworkTransition();
  }, [artworkId, artworkTitle, artworkArtist, artworkYear, session, currentArtwork, voiceMode]);

  useEffect(() => {
    if (!voiceManager.current && voiceSupported) {
      voiceManager.current = new DocentVoiceManager({ silenceTimeout: 30000 });

      voiceManager.current.onModeChanged((mode) => {
        setVoiceMode(mode);
      });

      voiceManager.current.onTranscriptReceived((text, isFinal) => {
        if (isFinal) {
          setInterimTranscript('');
          handleVoiceInputRef.current(text);
        } else {
          setInterimTranscript(text);
        }
      });

      voiceManager.current.onErrorOccurred((error) => {
        console.error('Voice error:', error);
        if (error !== 'no-speech' && error !== 'aborted') {
          alert(`Voice recognition error: ${error}`);
        }
      });
    }

    return () => {
      if (voiceManager.current) {
        voiceManager.current.destroy();
      }
    };
  }, [voiceSupported]);

  useEffect(() => {
    if (session.isPaused && voiceManager.current) {
      voiceManager.current.stopListening();
    }
  }, [session.isPaused]);

  const handleStartVoiceTour = async () => {
    if (!voiceManager.current || !currentArtwork) return;
    setIsInitializingVoice(true);
    try {
      await voiceManager.current.startTour(currentArtwork.id, currentArtwork.title, visitorName);
      session.startVoiceTour();
    } catch (error) {
      console.error('[PersistentChat] ❌ Failed to start voice tour:', error);
      alert('Failed to start voice tour. Please check your microphone permissions.');
    } finally {
      setIsInitializingVoice(false);
    }
  };

  const handleStopVoiceTour = () => {
    if (voiceManager.current) {
      voiceManager.current.stopTour();
      session.endVoiceTour();
      setInterimTranscript('');
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    if (!transcript.trim() || isTransitioningRef.current) return;
    session.updateActivity();
    const userMessage: ChatMessage = {
      id: `user-voice-${Date.now()}`,
      content: transcript,
      isUser: true,
      role: 'user',
      timestamp: new Date(),
      artworkId: artworkId
    };
    session.addMessage(userMessage);
    await sendMessageToAI(transcript, true);
  };

  handleVoiceInputRef.current = handleVoiceInput;

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    session.updateActivity();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      isUser: true,
      role: 'user',
      timestamp: new Date(),
      artworkId: artworkId
    };
    session.addMessage(userMessage);
    setInputMessage('');
    setIsLoading(true);
    if (inputRef.current) inputRef.current.style.height = 'auto';
    await sendMessageToAI(userMessage.content, false);
  };

  const sendMessageToAI = async (content: string, isVoiceInput: boolean) => {
    const useStreaming = isVoiceInput && session.isVoiceTourActive && !!voiceManager.current;
    setIsLoading(true);

    const conversationHistory = session.messages
      .filter(m => m.artworkId === artworkId)
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          artworkId,
          museumId: actualMuseumId,
          artworkTitle: currentArtwork?.title,
          artworkArtist: currentArtwork?.artist,
          visitorName: visitorName || null,
          docentName: docentName || null,
          stream: useStreaming,
          conversationHistory,
          voice: session.isVoiceTourActive,
        }),
      });

      if (!response.ok) throw new Error(`Chat API error: ${response.status}`);

      if (useStreaming && voiceManager.current) {
        setIsLoading(false);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let sentenceBuffer = '';

        const extractSentences = (text: string): { sentences: string[]; remaining: string } => {
          const sentences: string[] = [];
          const re = /[^.!?]+[.!?]["']?/g;
          let lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = re.exec(text)) !== null) {
            const s = m[0].trim();
            if (s.length > 1) sentences.push(s);
            lastIndex = m.index + m[0].length;
          }
          return { sentences, remaining: text.slice(lastIndex) };
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            sentenceBuffer += chunk;
            const { sentences, remaining } = extractSentences(sentenceBuffer);
            sentenceBuffer = remaining;
            for (const s of sentences) {
              voiceManager.current!.enqueueSentence(s);
            }
          }
          if (sentenceBuffer.trim()) {
            voiceManager.current!.enqueueSentence(sentenceBuffer.trim());
          }
        } catch (streamErr) {
          console.error('[PersistentChat] ❌ Stream read error:', streamErr);
        }

        voiceManager.current!.finalizeQueue();

        if (fullText.trim()) {
          session.addMessage({
            id: `ai-${Date.now()}`,
            content: fullText.trim(),
            isUser: false,
            role: 'assistant',
            timestamp: new Date(),
            artworkId,
          });
        }

      } else {
        const data = await response.json();

        if (data.actualMuseumId && data.actualMuseumId !== actualMuseumId) {
          setActualMuseumId(data.actualMuseumId);
        }

        session.addMessage({
          id: `ai-${Date.now()}`,
          content: data.response || 'I apologize, but I received an empty response. Please try again.',
          isUser: false,
          role: 'assistant',
          timestamp: new Date(),
          artworkId,
          artworkInfo: data.artwork ? {
            id: data.artwork.id,
            title: data.artwork.title,
            artist: data.artwork.artist,
            year: data.artwork.year,
          } : undefined,
          contextUsed: data.context_used,
          curatorNotesCount: data.curator_notes_count,
        });
        setIsLoading(false);
      }

    } catch (error) {
      console.error('[PersistentChat] ❌ Chat error:', error);
      session.addMessage({
        id: `error-${Date.now()}`,
        content: 'I apologize, but I encountered an error. Please try again.',
        isUser: false,
        role: 'assistant',
        timestamp: new Date(),
        artworkId,
      });
      setIsLoading(false);
      if (isVoiceInput && voiceManager.current && session.isVoiceTourActive) {
        voiceManager.current.resumeListening();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0D0A07' }}>

      {/* ==================== HEADER ==================== */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {currentArtwork ? (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', fontStyle: 'italic', color: 'rgba(242,232,213,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentArtwork.title}</p>
          ) : (
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.3)' }}>LOADING...</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {voiceSupported && (
            <VoiceTourButton
              isActive={session.isVoiceTourActive}
              isInitializing={isInitializingVoice}
              onStart={handleStartVoiceTour}
              onStop={handleStopVoiceTour}
              disabled={!currentArtwork}
            />
          )}
          <SourceToggle
            showSources={showSources}
            onToggle={setShowSources}
            curatorNotesCount={currentArtwork?.curator_notes?.length || 0}
          />
        </div>
      </div>

      {/* Voice Mode Indicator */}
      {session.isVoiceTourActive && (
        <div style={{ flexShrink: 0, padding: '10px 16px', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
          <VoiceModeIndicator mode={voiceMode} interimTranscript={interimTranscript} />
        </div>
      )}

      {/* Pause Indicator */}
      {session.isPaused && (
        <div style={{ flexShrink: 0, background: 'rgba(201,168,76,0.06)', borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(201,168,76,0.7)' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Session paused due to inactivity. Speak or type to resume.
          </div>
        </div>
      )}

      {/* ==================== MESSAGES ==================== */}
      <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {session.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              showSources={showSources}
            />
          ))}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: 'rgba(242,232,213,0.04)', border: '1px solid rgba(242,232,213,0.08)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <div key={i} style={{ width: '6px', height: '6px', background: 'rgba(201,168,76,0.4)', borderRadius: '50%', animation: 'bounce 1.2s infinite', animationDelay: `${delay}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
      </div>

      {/* ==================== SOURCE PANEL ==================== */}
      {showSources && currentArtwork && (
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(201,168,76,0.1)', background: 'rgba(201,168,76,0.04)', maxHeight: '120px', overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px' }}>
            <h4 style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.5)', marginBottom: '8px' }}>CONTEXT</h4>
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(242,232,213,0.4)', lineHeight: 1.6 }}>
              <p><span style={{ color: 'rgba(201,168,76,0.5)' }}>Museum:</span> {actualMuseumId}</p>
              <p><span style={{ color: 'rgba(201,168,76,0.5)' }}>Artwork:</span> {currentArtwork.title}</p>
              {currentArtwork.curator_notes && currentArtwork.curator_notes.length > 0 && (
                <p><span style={{ color: 'rgba(201,168,76,0.5)' }}>Curator Notes:</span> {currentArtwork.curator_notes.length} available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== INPUT ==================== */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(201,168,76,0.1)', background: '#0D0A07' }}>
        <div style={{ padding: '12px 16px' }}>
          {session.isVoiceTourActive && (
            <div style={{ textAlign: 'center', paddingBottom: '8px', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(242,232,213,0.3)', letterSpacing: '0.04em' }}>
              Voice tour active — speak naturally or type below
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={
                session.isVoiceTourActive
                  ? "Speak or type your question..."
                  : currentArtwork
                    ? `Ask about "${currentArtwork.title}"...`
                    : "Ask me anything..."
              }
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'rgba(242,232,213,0.04)',
                border: '1px solid rgba(201,168,76,0.15)',
                outline: 'none',
                resize: 'none',
                overflow: 'hidden',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '13px',
                fontWeight: 300,
                color: '#F2E8D5',
                letterSpacing: '0.03em',
                minHeight: '44px',
                maxHeight: '120px',
                height: 'auto',
                lineHeight: 1.5,
                transition: 'border-color 0.2s ease',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)')}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                padding: '10px 18px',
                background: (!inputMessage.trim() || isLoading) ? 'rgba(201,168,76,0.2)' : '#C9A84C',
                border: 'none',
                cursor: (!inputMessage.trim() || isLoading) ? 'default' : 'pointer',
                fontFamily: "'Cinzel', serif",
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: (!inputMessage.trim() || isLoading) ? 'rgba(201,168,76,0.4)' : '#0D0A07',
                flexShrink: 0,
                minHeight: '44px',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => { if (inputMessage.trim() && !isLoading) e.currentTarget.style.background = '#F2E8D5'; }}
              onMouseLeave={e => { if (inputMessage.trim() && !isLoading) e.currentTarget.style.background = '#C9A84C'; }}
            >
              SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
