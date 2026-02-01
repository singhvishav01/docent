// src/components/chat/ChatInterfaceWithVoice.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { SourceToggle } from './SourceToggle';
import { WinstonVoiceManager, VoiceMode } from '@/lib/voice/WinstonVoiceManager';
import { VoiceModeIndicator } from '../voice/VoiceModeIndicator';
import { VoiceTourButton } from '../voice/VoiceTourButton';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  role: 'user' | 'assistant';
  timestamp: Date;
  artworkInfo?: {
    id: string;
    title: string;
    artist: string;
    year?: number;
  };
  contextUsed?: boolean;
  curatorNotesCount?: number;
}

interface ChatInterfaceProps {
  artworkId: string;
  museumId?: string;
  artworkTitle?: string;
  onArtworkTransition?: (newArtworkId: string) => void;
}

export function ChatInterfaceWithVoice({ artworkId, museumId = 'met', artworkTitle, onArtworkTransition }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [currentArtwork, setCurrentArtwork] = useState<any>(null);
  const [actualMuseumId, setActualMuseumId] = useState<string>(museumId);
  
  // Voice state
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('dormant');
  const [isVoiceTourActive, setIsVoiceTourActive] = useState(false);
  const [isInitializingVoice, setIsInitializingVoice] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  // Use ref to avoid stale closure issues
  const isVoiceTourActiveRef = useRef(false);
  
  const voiceManager = useRef<WinstonVoiceManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check voice support on mount
  useEffect(() => {
    setVoiceSupported(WinstonVoiceManager.isSupported());
  }, []);

  // Load artwork when artworkId changes
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
          
          const welcomeMessage: ChatMessage = {
            id: `welcome-${artworkId}-${Date.now()}`,
            content: `Hello! I'm here to help you explore "${artwork.title}" by ${artwork.artist}${artwork.year ? ` (${artwork.year})` : ''}. What would you like to know about this artwork?`,
            isUser: false,
            role: 'assistant',
            timestamp: new Date(),
            artworkInfo: {
              id: artwork.id,
              title: artwork.title,
              artist: artwork.artist,
              year: artwork.year
            }
          };
          
          setMessages([welcomeMessage]);
          
          // Notify voice manager of artwork change if active
          if (isVoiceTourActive && voiceManager.current) {
            voiceManager.current.onArtworkChange(artwork.id, artwork.title);
          }
        }
      } catch (error) {
        console.error('Failed to load artwork:', error);
      }
    };

    if (artworkId && museumId) {
      loadArtwork();
    }
  }, [artworkId, museumId]);

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
          // Send the final transcript as a message
          handleVoiceInput(text);
        } else {
          setInterimTranscript(text);
        }
      });

      voiceManager.current.onErrorOccurred((error) => {
        console.error('Voice error:', error);
        if (error !== 'no-speech' && error !== 'aborted') {
          // Show error to user
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

  const handleStartVoiceTour = async () => {
    if (!voiceManager.current || !currentArtwork) return;

    console.log('[ChatInterface] 🎬 Starting voice tour...');
    setIsInitializingVoice(true);

    try {
      await voiceManager.current.startTour(currentArtwork.id, currentArtwork.title);
      setIsVoiceTourActive(true);
      isVoiceTourActiveRef.current = true; // Update ref too
      console.log('[ChatInterface] ✅ Voice tour activated - isVoiceTourActive set to TRUE');
    } catch (error) {
      console.error('[ChatInterface] ❌ Failed to start voice tour:', error);
      alert('Failed to start voice tour. Please check your microphone permissions.');
    } finally {
      setIsInitializingVoice(false);
    }
  };

  const handleStopVoiceTour = () => {
    console.log('[ChatInterface] 🛑 Stopping voice tour...');
    if (voiceManager.current) {
      voiceManager.current.stopTour();
      setIsVoiceTourActive(false);
      isVoiceTourActiveRef.current = false; // Update ref too
      setInterimTranscript('');
      console.log('[ChatInterface] ✅ Voice tour deactivated - isVoiceTourActive set to FALSE');
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    if (!transcript.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-voice-${Date.now()}`,
      content: transcript,
      isUser: true,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Get AI response
    await sendMessageToAI(transcript, true);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      isUser: true,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    await sendMessageToAI(userMessage.content, false);
  };

  const sendMessageToAI = async (content: string, isVoiceInput: boolean) => {
    // Use ref to get current value, avoiding stale closure
    const isVoiceActive = isVoiceTourActiveRef.current;
    
    console.log(`[ChatInterface] 📤 Sending message (voice: ${isVoiceInput}): "${content.substring(0, 50)}..."`);
    console.log(`[ChatInterface] 🎤 Voice tour active (state): ${isVoiceTourActive}`);
    console.log(`[ChatInterface] 🎤 Voice tour active (ref): ${isVoiceActive}`);
    console.log(`[ChatInterface] 🎤 Voice manager exists: ${!!voiceManager.current}`);
    
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
      console.log(`[ChatInterface] 📥 Received response: "${data.response?.substring(0, 50)}..."`);

      if (data.actualMuseumId && data.actualMuseumId !== actualMuseumId) {
        setActualMuseumId(data.actualMuseumId);
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: data.response || 'I apologize, but I received an empty response. Please try again.',
        isUser: false,
        role: 'assistant',
        timestamp: new Date(),
        artworkInfo: data.artwork ? {
          id: data.artwork.id,
          title: data.artwork.title,
          artist: data.artwork.artist,
          year: data.artwork.year
        } : undefined,
        contextUsed: data.context_used,
        curatorNotesCount: data.curator_notes_count
      };

      setMessages(prev => [...prev, aiMessage]);

      // IMPORTANT: Use ref value to check if voice is active
      if (isVoiceInput && voiceManager.current && isVoiceActive) {
        console.log('[ChatInterface] 🎤 All conditions met - entering voice response mode');
        console.log('[ChatInterface] 🎤 Voice mode active - will speak response');
        setIsLoading(false); // Clear loading UI
        
        try {
          console.log('[ChatInterface] 🔊 Calling speakWithInterruption()...');
          const result = await voiceManager.current.speakWithInterruption(aiMessage.content);
          
          if (result === 'completed') {
            console.log('[ChatInterface] ✅ Speaking completed without interruption');
            // Resume listening after speaking completes
            console.log('[ChatInterface] 🎤 Resuming listening...');
            voiceManager.current.resumeListening();
            console.log('[ChatInterface] ✅ Resume listening called');
          } else {
            console.log('[ChatInterface] 🛑 Speaking was interrupted by user');
            console.log('[ChatInterface] ⏭️  New question already being processed, not resuming');
            // Don't resume listening - the interruption already triggered a new question
            // The new question is being processed through the normal flow
          }
        } catch (speechError) {
          console.error('[ChatInterface] ❌ Speech error:', speechError);
          // Even if speech fails, resume listening
          console.log('[ChatInterface] 🔄 Resuming listening despite error...');
          voiceManager.current.resumeListening();
        }
      } else {
        console.log('[ChatInterface] 💬 Text mode - not speaking');
        console.log('[ChatInterface] 💬 Reason: isVoiceInput=' + isVoiceInput + ', hasManager=' + !!voiceManager.current + ', isActive=' + isVoiceActive);
        setIsLoading(false);
      }

    } catch (error) {
      console.error('[ChatInterface] ❌ Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I encountered an error. Please try again.',
        isUser: false,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      
      // Resume listening even after error - use ref value
      if (isVoiceInput && voiceManager.current && isVoiceTourActiveRef.current) {
        console.log('[ChatInterface] 🔄 Resuming listening after error...');
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
                isActive={isVoiceTourActive}
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
              isActive={isVoiceTourActive}
              isInitializing={isInitializingVoice}
              onStart={handleStartVoiceTour}
              onStop={handleStopVoiceTour}
              disabled={!currentArtwork}
            />
          )}
        </div>
      </div>

      {/* Voice Mode Indicator */}
      {isVoiceTourActive && (
        <div className="flex-shrink-0 p-3 border-b border-gray-100">
          <VoiceModeIndicator mode={voiceMode} interimTranscript={interimTranscript} />
        </div>
      )}

      {/* ==================== MESSAGES ==================== */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {messages.map((message) => (
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
          {isVoiceTourActive ? (
            <div className="text-center py-2 text-sm text-gray-500">
              <p>Voice tour active - speak naturally or type below</p>
            </div>
          ) : null}
          
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={
                isVoiceTourActive 
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