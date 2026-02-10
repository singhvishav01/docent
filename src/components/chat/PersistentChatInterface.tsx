// src/components/chat/PersistentChatInterface.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { SourceToggle } from './SourceToggle';
import { WinstonVoiceManager, VoiceMode } from '@/lib/voice/WinstonVoiceManager';
import { VoiceModeIndicator } from '../voice/VoiceModeIndicator';
import { VoiceTourButton } from '../voice/VoiceTourButton';
import { useSession } from '@/contexts/SessionProvider';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  role: 'user' | 'assistant';
  timestamp: Date;
  artworkId: string; // Track which artwork this message is about
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
  
  // Local UI state
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [currentArtwork, setCurrentArtwork] = useState<any>(null);
  const [actualMuseumId, setActualMuseumId] = useState<string>(museumId);
  
  // Voice state
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('dormant');
  const [isInitializingVoice, setIsInitializingVoice] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  // Track last artwork to detect changes
  const lastArtworkIdRef = useRef<string>(artworkId);
  const isTransitioningRef = useRef(false);
  
  const voiceManager = useRef<WinstonVoiceManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages]);

  // Check voice support on mount
  useEffect(() => {
    setVoiceSupported(WinstonVoiceManager.isSupported());
  }, []);

  // Load artwork data when artworkId changes
  useEffect(() => {
    const loadArtwork = async () => {
      try {
        const response = await fetch(`/api/artworks/${artworkId}?museum=${museumId}`);
        if (response.ok) {
          const data = await response.json();
          const artwork = data.artwork;
          setCurrentArtwork(artwork);
          
          if (data.museum && data.museum !== museumId) {
            setActualMuseumId(data.museum);
          } else {
            setActualMuseumId(museumId);
          }
        }
      } catch (error) {
        console.error('Failed to load artwork:', error);
      }
    };

    loadArtwork();
  }, [artworkId, museumId]);

  // Handle artwork transitions
  useEffect(() => {
    const handleArtworkTransition = async () => {
      // Detect if artwork has changed
      if (lastArtworkIdRef.current === artworkId) {
        return; // Same artwork, no transition needed
      }

      console.log(`[PersistentChat] 🎨 Artwork transition: ${lastArtworkIdRef.current} → ${artworkId}`);
      
      const previousArtworkId = lastArtworkIdRef.current;
      lastArtworkIdRef.current = artworkId;

      // If voice tour is active, handle the transition
      if (session.isVoiceTourActive && voiceManager.current && currentArtwork) {
        console.log('[PersistentChat] 🎤 Voice tour active during transition');
        isTransitioningRef.current = true;

        try {
          // 1. Stop current speech if speaking
          if (voiceMode === 'speaking') {
            console.log('[PersistentChat] 🛑 Stopping current speech...');
            voiceManager.current.stopSpeaking();
          }

          // 2. Wait a moment for any in-progress operations
          await new Promise(resolve => setTimeout(resolve, 500));

          // 3. Announce the new artwork
          const announcementText = `Now viewing ${artworkTitle} by ${artworkArtist}${artworkYear ? `, created in ${artworkYear}` : ''}.`;
          
          console.log(`[PersistentChat] 📢 Announcing: "${announcementText}"`);
          
          // Add system message to chat
          const transitionMessage: ChatMessage = {
            id: `transition-${artworkId}-${Date.now()}`,
            content: announcementText,
            isUser: false,
            role: 'assistant',
            timestamp: new Date(),
            artworkId: artworkId,
            artworkInfo: {
              id: artworkId,
              title: artworkTitle || 'Artwork',
              artist: artworkArtist || 'Unknown Artist',
              year: artworkYear
            }
          };
          
          session.addMessage(transitionMessage);

          // 4. Speak the announcement
          await voiceManager.current.speak(announcementText);

          // 5. Resume listening
          console.log('[PersistentChat] 🎤 Resuming listening after transition...');
          voiceManager.current.resumeListening();

          // 6. Update voice manager's artwork context
          voiceManager.current.onArtworkChange(artworkId, artworkTitle || 'Artwork');
          
        } catch (error) {
          console.error('[PersistentChat] ❌ Transition error:', error);
        } finally {
          isTransitioningRef.current = false;
        }
      } else {
        console.log('[PersistentChat] 💬 Text mode - no voice announcement');
      }
    };

    handleArtworkTransition();
  }, [artworkId, artworkTitle, artworkArtist, artworkYear, session, currentArtwork, voiceMode]);

  // Initialize voice manager
  useEffect(() => {
    if (!voiceManager.current && voiceSupported) {
      voiceManager.current = new WinstonVoiceManager({
        silenceTimeout: 30000 // 30 seconds
      });

      // Set up voice event listeners
      voiceManager.current.onModeChanged((mode) => {
        setVoiceMode(mode);
      });

      voiceManager.current.onTranscriptReceived((text, isFinal) => {
        if (isFinal) {
          setInterimTranscript('');
          handleVoiceInput(text);
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

  // Handle session pause/resume
  useEffect(() => {
    if (session.isPaused && voiceManager.current) {
      console.log('[PersistentChat] ⏸️  Session paused - stopping voice');
      voiceManager.current.stopListening();
    }
  }, [session.isPaused]);

  const handleStartVoiceTour = async () => {
    if (!voiceManager.current || !currentArtwork) return;

    console.log('[PersistentChat] 🎬 Starting voice tour session...');
    setIsInitializingVoice(true);

    try {
      await voiceManager.current.startTour(currentArtwork.id, currentArtwork.title);
      session.startVoiceTour();
      console.log('[PersistentChat] ✅ Voice tour activated globally');
    } catch (error) {
      console.error('[PersistentChat] ❌ Failed to start voice tour:', error);
      alert('Failed to start voice tour. Please check your microphone permissions.');
    } finally {
      setIsInitializingVoice(false);
    }
  };

  const handleStopVoiceTour = () => {
    console.log('[PersistentChat] 🛑 Ending voice tour session...');
    if (voiceManager.current) {
      voiceManager.current.stopTour();
      session.endVoiceTour();
      setInterimTranscript('');
      console.log('[PersistentChat] ✅ Voice tour deactivated globally');
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    if (!transcript.trim() || isTransitioningRef.current) return;

    session.updateActivity(); // Reset inactivity timer

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-voice-${Date.now()}`,
      content: transcript,
      isUser: true,
      role: 'user',
      timestamp: new Date(),
      artworkId: artworkId
    };

    session.addMessage(userMessage);

    // Get AI response
    await sendMessageToAI(transcript, true);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    session.updateActivity(); // Reset inactivity timer

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

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    await sendMessageToAI(userMessage.content, false);
  };

  const sendMessageToAI = async (content: string, isVoiceInput: boolean) => {
    console.log(`[PersistentChat] 📤 Sending message (voice: ${isVoiceInput}): "${content.substring(0, 50)}..."`);
    console.log(`[PersistentChat] 🎤 Voice tour active: ${session.isVoiceTourActive}`);
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          artworkId,
          museumId: actualMuseumId,
          artworkTitle: currentArtwork?.title,
          artworkArtist: currentArtwork?.artist
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[PersistentChat] 📥 Received response: "${data.response?.substring(0, 50)}..."`);

      if (data.actualMuseumId && data.actualMuseumId !== actualMuseumId) {
        setActualMuseumId(data.actualMuseumId);
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: data.response || 'I apologize, but I received an empty response. Please try again.',
        isUser: false,
        role: 'assistant',
        timestamp: new Date(),
        artworkId: artworkId,
        artworkInfo: data.artwork ? {
          id: data.artwork.id,
          title: data.artwork.title,
          artist: data.artwork.artist,
          year: data.artwork.year
        } : undefined,
        contextUsed: data.context_used,
        curatorNotesCount: data.curator_notes_count
      };

      session.addMessage(aiMessage);

      // Handle voice response
      if (isVoiceInput && voiceManager.current && session.isVoiceTourActive) {
        console.log('[PersistentChat] 🎤 Voice mode - speaking response');
        setIsLoading(false);
        
        try {
          const result = await voiceManager.current.speakWithInterruption(aiMessage.content);
          
          if (result === 'completed') {
            console.log('[PersistentChat] ✅ Speaking completed');
            voiceManager.current.resumeListening();
          } else {
            console.log('[PersistentChat] 🛑 Speaking interrupted');
          }
        } catch (speechError) {
          console.error('[PersistentChat] ❌ Speech error:', speechError);
          voiceManager.current.resumeListening();
        }
      } else {
        setIsLoading(false);
      }

    } catch (error) {
      console.error('[PersistentChat] ❌ Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I encountered an error. Please try again.',
        isUser: false,
        role: 'assistant',
        timestamp: new Date(),
        artworkId: artworkId
      };
      session.addMessage(errorMessage);
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
    <div className="flex flex-col h-full bg-white">
      {/* ==================== HEADER ==================== */}
      <div className="flex-shrink-0 border-b border-gray-200">
        {/* Desktop/Tablet Header */}
        <div className="hidden sm:flex items-center justify-between p-3 sm:p-4">
          <div className="flex-1 min-w-0">
            {currentArtwork ? (
              <div className="text-sm">
                <h3 className="font-semibold text-gray-800 truncate">{currentArtwork.title}</h3>
                <p className="text-gray-600 truncate">{currentArtwork.artist}{currentArtwork.year ? ` (${currentArtwork.year})` : ''}</p>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Loading...</div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
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

        {/* Mobile Header */}
        <div className="sm:hidden flex flex-col gap-2 p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">
                {currentArtwork?.title || 'Loading...'}
              </p>
            </div>
            <SourceToggle 
              showSources={showSources} 
              onToggle={setShowSources}
              curatorNotesCount={currentArtwork?.curator_notes?.length || 0}
            />
          </div>
          {voiceSupported && (
            <VoiceTourButton
              isActive={session.isVoiceTourActive}
              isInitializing={isInitializingVoice}
              onStart={handleStartVoiceTour}
              onStop={handleStopVoiceTour}
              disabled={!currentArtwork}
            />
          )}
        </div>
      </div>

      {/* Voice Mode Indicator */}
      {session.isVoiceTourActive && (
        <div className="flex-shrink-0 p-3 border-b border-gray-100">
          <VoiceModeIndicator mode={voiceMode} interimTranscript={interimTranscript} />
        </div>
      )}

      {/* Pause Indicator */}
      {session.isPaused && (
        <div className="flex-shrink-0 bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Session paused due to inactivity. Speak or type to resume.</span>
          </div>
        </div>
      )}

      {/* ==================== MESSAGES ==================== */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {session.messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              showSources={showSources}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ==================== SOURCE PANEL ==================== */}
      {showSources && currentArtwork && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 max-h-40 overflow-y-auto">
          <div className="p-3 sm:p-4">
            <h4 className="font-semibold text-xs sm:text-sm text-gray-700 mb-2">Current Context:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Museum:</strong> {actualMuseumId}</p>
              <p><strong>Artwork:</strong> {currentArtwork.title}</p>
              {currentArtwork.curator_notes && currentArtwork.curator_notes.length > 0 && (
                <p><strong>Curator Notes:</strong> {currentArtwork.curator_notes.length} available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== INPUT ==================== */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white">
        <div className="p-3 sm:p-4">
          {session.isVoiceTourActive && (
            <div className="text-center py-2 text-sm text-gray-500">
              <p>Voice tour active - speak naturally or type below</p>
            </div>
          )}
          
          <div className="flex items-end gap-2">
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm sm:text-base min-h-[44px] max-h-[120px]"
              disabled={isLoading}
              rows={1}
              style={{ height: 'auto' }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 min-h-[44px] text-sm sm:text-base font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}