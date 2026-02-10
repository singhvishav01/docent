// src/contexts/SessionProvider.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

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

interface SessionState {
  sessionId: string;
  messages: ChatMessage[];
  isVoiceTourActive: boolean;
  sessionStartTime: Date;
  lastActivityTime: Date;
  isPaused: boolean;
}

interface SessionContextType {
  // State
  messages: ChatMessage[];
  isVoiceTourActive: boolean;
  isPaused: boolean;
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  startVoiceTour: () => void;
  endVoiceTour: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  updateActivity: () => void;
  
  // Session info
  sessionId: string;
  sessionDuration: number;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionState, setSessionState] = useState<SessionState>(() => ({
    sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    messages: [],
    isVoiceTourActive: false,
    sessionStartTime: new Date(),
    lastActivityTime: new Date(),
    isPaused: false,
  }));

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      lastActivityTime: new Date(),
      isPaused: false, // Resume if paused
    }));

    // Reset inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Only set inactivity timer if voice tour is active
    if (sessionState.isVoiceTourActive) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('[SessionProvider] 💤 Inactivity timeout - pausing session');
        setSessionState(prev => ({
          ...prev,
          isPaused: true,
        }));
      }, INACTIVITY_TIMEOUT);
    }
  }, [sessionState.isVoiceTourActive]);

  // Add message to conversation
  const addMessage = useCallback((message: ChatMessage) => {
    setSessionState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
    updateActivity();
  }, [updateActivity]);

  // Clear all messages (full reset)
  const clearMessages = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      messages: [],
    }));
  }, []);

  // Start voice tour
  const startVoiceTour = useCallback(() => {
    console.log('[SessionProvider] 🎬 Starting voice tour session');
    setSessionState(prev => ({
      ...prev,
      isVoiceTourActive: true,
      isPaused: false,
    }));
    updateActivity(); // Start inactivity timer
  }, [updateActivity]);

  // End voice tour (full session end)
  const endVoiceTour = useCallback(() => {
    console.log('[SessionProvider] 🛑 Ending voice tour session');
    
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    setSessionState(prev => ({
      ...prev,
      isVoiceTourActive: false,
      isPaused: false,
    }));
  }, []);

  // Pause session (inactivity)
  const pauseSession = useCallback(() => {
    console.log('[SessionProvider] ⏸️  Pausing session due to inactivity');
    setSessionState(prev => ({
      ...prev,
      isPaused: true,
    }));
  }, []);

  // Resume session
  const resumeSession = useCallback(() => {
    console.log('[SessionProvider] ▶️  Resuming session');
    updateActivity();
  }, [updateActivity]);

  // Calculate session duration
  const sessionDuration = Math.floor(
    (new Date().getTime() - sessionState.sessionStartTime.getTime()) / 1000
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  const value: SessionContextType = {
    messages: sessionState.messages,
    isVoiceTourActive: sessionState.isVoiceTourActive,
    isPaused: sessionState.isPaused,
    addMessage,
    clearMessages,
    startVoiceTour,
    endVoiceTour,
    pauseSession,
    resumeSession,
    updateActivity,
    sessionId: sessionState.sessionId,
    sessionDuration,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}