// src/components/chat/ChatInterface.tsx - FULLY RESPONSIVE
'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { SourceToggle } from './SourceToggle';

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

export function ChatInterface({ artworkId, museumId = 'met', artworkTitle, onArtworkTransition }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [currentArtwork, setCurrentArtwork] = useState<any>(null);
  const [actualMuseumId, setActualMuseumId] = useState<string>(museumId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        }
      } catch (error) {
        console.error('Failed to load artwork:', error);
      }
    };

    if (artworkId && museumId) {
      loadArtwork();
    }
  }, [artworkId, museumId]);

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

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
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
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I encountered an error. Please try again.',
        isUser: false,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Auto-resize
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
            <SourceToggle 
              showSources={showSources} 
              onToggle={setShowSources}
              curatorNotesCount={currentArtwork?.curator_notes?.length || 0}
            />
          </div>
        </div>

        {/* Mobile Header */}
        <div className="sm:hidden flex items-center justify-between p-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">
              Chatting about: {currentArtwork?.title || 'Loading...'}
            </p>
          </div>
          <SourceToggle 
            showSources={showSources} 
            onToggle={setShowSources}
            curatorNotesCount={currentArtwork?.curator_notes?.length || 0}
          />
        </div>
      </div>

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

      {/* ==================== SOURCE PANEL (collapsible) ==================== */}
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
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={currentArtwork ? `Ask about "${currentArtwork.title}"...` : "Ask me anything..."}
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
          {/* Mobile helper text */}
          <p className="text-xs text-gray-500 mt-2 sm:hidden">
            Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
