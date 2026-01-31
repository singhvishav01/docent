// src/components/chat/ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { SourceToggle } from './SourceToggle';
import { TransitionIndicator } from './TransitionIndicator';

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
  const [actualMuseumId, setActualMuseumId] = useState<string>(museumId); // Track actual museum
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load artwork data when artworkId changes
  useEffect(() => {
    const loadArtwork = async () => {
      try {
        console.log(`Loading artwork: ${artworkId} from museum: ${museumId}`);
        const response = await fetch(`/api/artworks/${artworkId}?museum=${museumId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Artwork API response:', data);
          
          const artwork = data.artwork;
          setCurrentArtwork(artwork);
          
          // FIXED: Update the actual museum ID based on where artwork was found
          if (data.museum && data.museum !== museumId) {
            console.log(`Artwork found in different museum: ${data.museum} instead of ${museumId}`);
            setActualMuseumId(data.museum);
          } else {
            setActualMuseumId(museumId);
          }
          
          // Add welcome message when artwork changes
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
        } else {
          console.error('Failed to load artwork:', response.status, response.statusText);
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            content: `Sorry, I couldn't find information about artwork "${artworkId}" in the ${museumId} collection. Please check if the artwork ID is correct.`,
            isUser: false,
            role: 'assistant',
            timestamp: new Date()
          };
          setMessages([errorMessage]);
        }
      } catch (error) {
        console.error('Failed to load artwork:', error);
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          content: 'Sorry, I encountered an error loading the artwork information. Please try again.',
          isUser: false,
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages([errorMessage]);
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

    try {
      console.log('Sending chat request:', { 
        message: inputMessage, 
        artworkId, 
        museumId: actualMuseumId, // FIXED: Use the actual museum ID
        currentArtwork: currentArtwork?.id 
      });
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          artworkId,
          museumId: actualMuseumId, // FIXED: Use the actual museum ID where artwork was found
          // FIXED: Include additional context about the current artwork
          artworkTitle: currentArtwork?.title,
          artworkArtist: currentArtwork?.artist
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Chat API response:', data);

      // FIXED: Update museum ID if the chat response indicates a different museum
      if (data.actualMuseumId && data.actualMuseumId !== actualMuseumId) {
        console.log(`Chat response indicates different museum: ${data.actualMuseumId}`);
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

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header with artwork info and controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex-1">
          {currentArtwork ? (
            <div className="text-sm">
              <h3 className="font-semibold text-gray-800">{currentArtwork.title}</h3>
              <p className="text-gray-600">{currentArtwork.artist}{currentArtwork.year ? ` (${currentArtwork.year})` : ''}</p>
              <p className="text-xs text-gray-500">Museum: {actualMuseumId}</p>
              {actualMuseumId !== museumId && (
                <p className="text-xs text-orange-600">
                  Found in {actualMuseumId} (requested {museumId})
                </p>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Loading artwork information...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SourceToggle 
            showSources={showSources} 
            onToggle={setShowSources}
            curatorNotesCount={currentArtwork?.curator_notes?.length || 0}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

      {/* Source information panel */}
      {showSources && currentArtwork && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Current Artwork Context:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>ID:</strong> {currentArtwork.id}</p>
            <p><strong>Museum:</strong> {actualMuseumId}</p>
            {actualMuseumId !== museumId && (
              <p className="text-orange-600"><strong>Requested:</strong> {museumId}</p>
            )}
            <p><strong>Title:</strong> {currentArtwork.title}</p>
            <p><strong>Artist:</strong> {currentArtwork.artist}</p>
            {currentArtwork.year && <p><strong>Year:</strong> {currentArtwork.year}</p>}
            {currentArtwork.medium && <p><strong>Medium:</strong> {currentArtwork.medium}</p>}
            {currentArtwork.description && <p><strong>Description:</strong> {currentArtwork.description.substring(0, 100)}...</p>}
            {currentArtwork.curator_notes && currentArtwork.curator_notes.length > 0 && (
              <p><strong>Curator Notes:</strong> {currentArtwork.curator_notes.length} available</p>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentArtwork ? `Ask me about "${currentArtwork.title}"...` : "Ask me about this artwork..."}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}