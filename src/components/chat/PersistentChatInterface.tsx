// src/components/chat/PersistentChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { SourceToggle } from './SourceToggle';
import { DocentVoiceManager, VoiceMode } from '@/lib/voice/DocentVoiceManager';
import { VoiceModeIndicator } from '../voice/VoiceModeIndicator';
import { VoiceTourButton } from '../voice/VoiceTourButton';
import { NoisyEnvironmentBanner } from '@/components/voice/NoisyEnvironmentBanner';
import { useSession } from '@/contexts/SessionProvider';
import { useVisitor } from '@/contexts/VisitorContext';
import { useArtwork } from '@/contexts/ArtworkContext';
import { applyHeuristics } from '@/lib/acquaintance/profile';
import { TransitionManager } from '@/lib/tour/TransitionManager';
import { Cortex } from '@/cortex';
import type { ArtworkInfo } from '@/cortex';

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
  /** When true, moves the voice tour button to a fixed bottom-center thumb-zone button
   *  and hides it from the chat header toolbar. Use on mobile layouts. */
  thumbZoneVoice?: boolean;
}

export function PersistentChatInterface({
  artworkId,
  museumId = 'met',
  artworkTitle,
  artworkArtist,
  artworkYear,
  thumbZoneVoice = false,
}: PersistentChatInterfaceProps) {
  const session = useSession();
  const { visitorName, docentName, visitorProfile, updateVisitorProfile } = useVisitor();
  const { activeArtwork: contextArtwork } = useArtwork();

  const assistantMessageCountRef = useRef(0);

  // Rolling conversation summary — condenses old turns to save tokens
  // Resets when the active artwork changes
  const conversationSummaryRef = useRef<string>('');
  const summaryMessageCountRef = useRef(0); // messages processed into current summary

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
  const [noisySuggestion, setNoisySuggestion] = useState<string | null>(null);
  const [isInitializingVoice, setIsInitializingVoice] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);

  const lastArtworkIdRef = useRef<string>(artworkId);

  const voiceManager = useRef<DocentVoiceManager | null>(null);
  const transitionManager = useRef<TransitionManager | null>(null);
  const cortexRef = useRef<Cortex | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handleVoiceInputRef = useRef<(text: string) => Promise<void>>(async () => {});

  // Track what docent has said about the current artwork — used for smart transitions
  const spokenSoFarRef = useRef<string>('');
  const sentenceCountRef = useRef<number>(0);

  // Keep a stable ref to session + visitorProfile for callbacks that need fresh values
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const visitorProfileRef = useRef(visitorProfile);
  visitorProfileRef.current = visitorProfile;

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
    if (contextFull) {
      setActualMuseumId(contextFull.museumId || museumId);
      return;
    }
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

  // ── TransitionManager setup ──────────────────────────────────────────────
  useEffect(() => {
    const tm = new TransitionManager({ dwellMs: 2000, cooldownMs: 3000 });
    tm.setInitialArtwork(artworkId);
    transitionManager.current = tm;

    // Wire artwork detection to Cortex
    tm.onArtworkDetected((artwork) => {
      cortexRef.current?.emit('artwork_detected', artwork, 'transition_manager');
    });

    // Wire the callback — always uses latest refs
    tm.onReady(async (request, context) => {
      const s = sessionRef.current;
      const vm = voiceManager.current;
      const vp = visitorProfileRef.current;

      console.log(
        `[PersistentChat] Transition: "${request.previousArtworkId}" -> "${request.newArtworkId}"`
      );

      try {
        // 1. Finish current sentence gracefully if voice is active
        const wasMidSpeech = !!(vm && s.isVoiceTourActive && vm.isCurrentlyPlaying());
        if (wasMidSpeech) {
          vm!.clearQueueKeepCurrent();
          await vm!.waitForCurrentSentence(4000);
        }

        // 2. Abort any in-flight LLM stream
        if (streamAbortRef.current) {
          streamAbortRef.current.abort();
          streamAbortRef.current = null;
        }

        // 3. Detect mid-question: did the last visitor turn end with '?'
        const prevMsgs = s.messages.filter(
          (m: ChatMessage) => m.artworkId === request.previousArtworkId
        );
        const lastUserMsg = [...prevMsgs].reverse().find((m: ChatMessage) => m.role === 'user');
        context.midQuestion = !!(lastUserMsg && lastUserMsg.content.trim().endsWith('?'));

        // 4. Build prev-artwork info from message history
        const prevAssistantMsgs = prevMsgs.filter((m: ChatMessage) => m.role === 'assistant');
        const prevTitle = prevAssistantMsgs[0]?.artworkInfo?.title ?? undefined;
        const prevArtist = prevAssistantMsgs[0]?.artworkInfo?.artist ?? undefined;
        const lastMessages = prevMsgs
          .slice(-4)
          .map((m: ChatMessage) => ({ role: m.role, content: m.content }));

        // 5. Call the upgraded transition API
        let transitionText: string;
        try {
          const res = await fetch('/api/chat/transition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              previousTitle: prevTitle,
              previousArtist: prevArtist,
              newTitle: request.newTitle,
              newArtist: request.newArtist,
              newYear: request.newYear,
              lastMessages,
              spokenSoFar: context.spokenSoFar,
              visitorProfile: vp || null,
              isReturnVisit: context.isReturnVisit,
              barelyStarted: context.barelyStarted,
              midQuestion: context.midQuestion,
              midSpeech: wasMidSpeech,
            }),
          });
          const data = await res.json();
          transitionText = data.transition;
        } catch {
          transitionText = context.isReturnVisit
            ? `Back to "${request.newTitle}"${request.newArtist ? ` by ${request.newArtist}` : ''}. Let me share something new.`
            : `Moving on to "${request.newTitle}"${request.newArtist ? ` by ${request.newArtist}` : ''}${request.newYear ? `, ${request.newYear}` : ''}.`;
        }

        // 6. Add transition message to session
        const transitionMsg: ChatMessage = {
          id: `transition-${request.newArtworkId}-${Date.now()}`,
          content: transitionText,
          isUser: false,
          role: 'assistant',
          timestamp: new Date(),
          artworkId: request.newArtworkId,
          artworkInfo: {
            id: request.newArtworkId,
            title: request.newTitle,
            artist: request.newArtist || 'Unknown Artist',
            year: request.newYear,
          },
        };
        s.addMessage(transitionMsg);

        // 7. Enqueue to voice pipeline if active
        if (s.isVoiceTourActive && vm) {
          vm.enqueueSentence(transitionText);
          vm.finalizeQueue();
          vm.resetSentenceCount();
        }

        // 8. Reset spokenSoFar tracking for the new artwork
        spokenSoFarRef.current = '';
        sentenceCountRef.current = 0;

      } catch (error) {
        console.error('[PersistentChat] Transition callback error:', error);
      }
    });

    return () => {
      tm.destroy();
      transitionManager.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Artwork change detection ──────────────────────────────────────────────
  useEffect(() => {
    if (lastArtworkIdRef.current === artworkId) return;

    const previousArtworkId = lastArtworkIdRef.current;
    lastArtworkIdRef.current = artworkId;

    if (!artworkTitle) return;

    console.log(`[PersistentChat] Artwork changed: ${previousArtworkId} -> ${artworkId}`);

    // Reset rolling summary for the new artwork
    conversationSummaryRef.current = '';
    summaryMessageCountRef.current = 0;

    transitionManager.current?.requestTransition({
      previousArtworkId,
      newArtworkId: artworkId,
      newTitle: artworkTitle,
      newArtist: artworkArtist,
      newYear: artworkYear,
    });

    // Update Cortex with current artwork info
    if (cortexRef.current && artworkTitle) {
      cortexRef.current.setCurrentArtwork({
        id: artworkId,
        title: artworkTitle,
        artist: artworkArtist,
        year: artworkYear,
      });
    }

    // If artworkId changed AFTER initial mount and a voice tour is running,
    // transition the voice layer to the new artwork without destroying the pipeline.
    if (lastArtworkIdRef.current !== artworkId && artworkTitle) {
      const mode = voiceManager.current?.getMode();
      if (mode && mode !== 'dormant') {
        voiceManager.current!.onArtworkChange(artworkId, artworkTitle);
      }
    }
    lastArtworkIdRef.current = artworkId;
  }, [artworkId, artworkTitle, artworkArtist, artworkYear]);

  // ── Voice manager setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (!voiceManager.current && voiceSupported) {
      voiceManager.current = new DocentVoiceManager({ silenceTimeout: 30000 });

      voiceManager.current.onModeChanged((mode) => {
        setVoiceMode(mode);
      });

      voiceManager.current.onTranscriptReceived((text, isFinal) => {
        if (isFinal) {
          setInterimTranscript('');
          if (cortexRef.current) {
            // Cortex decides whether/how to respond — it calls onRespond → handleVoiceInput.
            // Do NOT also call handleVoiceInputRef directly here: that would fire two
            // sendMessageToAI calls, the second of which aborts the first (AbortError).
            cortexRef.current.emit('visitor_spoke', {
              transcript: text,
              wordCount: text.trim().split(/\s+/).length,
            }, 'voice_manager');
          } else {
            // Cortex not yet initialized — call directly as fallback
            handleVoiceInputRef.current(text);
          }
        } else {
          setInterimTranscript(text);
        }
      });

      voiceManager.current.onSilenceDetected((duration) => {
        cortexRef.current?.emit('visitor_silent', { duration }, 'voice_manager');
      });

      voiceManager.current.onErrorOccurred((error) => {
        console.error('Voice error:', error);
        // no-speech and aborted are normal — don't surface to user
      });

      voiceManager.current.onNoisyEnvironmentDetected((suggestion) => {
        setNoisySuggestion(suggestion);
      });
    }

    return () => {
      // Abort any in-flight stream
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
        streamAbortRef.current = null;
      }
      if (voiceManager.current) {
        voiceManager.current.destroy();
        voiceManager.current = null; // null after destroy so re-mount creates a fresh instance
      }
    };
  }, [voiceSupported]);

  useEffect(() => {
    if (session.isPaused) {
      voiceManager.current?.stopListening();
      cortexRef.current?.setPaused(true);
    } else {
      if (voiceManager.current && session.isVoiceTourActive) {
        voiceManager.current.resumeListening();
      }
      // setPaused(false) internally emits session_resumed with the tracked pause duration
      cortexRef.current?.setPaused(false);
    }
  }, [session.isPaused, session.isVoiceTourActive]);

  // ── Cortex setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visitorProfile) return;

    // Create or update Cortex
    if (!cortexRef.current) {
      cortexRef.current = new Cortex(visitorProfile);
    } else {
      cortexRef.current.updateProfile(visitorProfile);
    }

    const cortex = cortexRef.current;

    // Register action callbacks — these map Cortex decisions to existing code paths
    cortex.registerCallbacks({
      onRespond: (transcript: string, _strategy: string, _maxTokens: number) => {
        // Inject strategy as a hint into the conversation
        handleVoiceInputRef.current(transcript);
      },

      onIntroduceArtwork: (_artwork: ArtworkInfo) => {
        // Trigger greeting for the artwork
        cortex.emit('session_started', { artwork: _artwork }, 'cortex');
      },

      onGentlePrompt: (style: 'observational' | 'check_in', _artwork: ArtworkInfo | null) => {
        if (!voiceManager.current || !session.isVoiceTourActive) return;
        const prompts = style === 'observational'
          ? ["There's actually a detail here most people walk right past — want me to point it out?",
             "I keep coming back to one thing in this painting. Want to hear what it is?"]
          : ["Still with me? Or would you rather move to the next one?",
             "Take your time — I'm here when you're ready."];
        const text = prompts[Math.floor(Math.random() * prompts.length)];
        const gen = voiceManager.current.beginNewVoiceResponse();
        voiceManager.current.enqueueSentence(text, gen);
        voiceManager.current.finalizeQueue();
      },

      onPivot: (approach: 'analogy' | 'story', interests: string[]) => {
        if (!voiceManager.current || !session.isVoiceTourActive) return;
        const hint = approach === 'analogy' && interests.length > 0
          ? `Actually, here's something that might hit differently — there's a connection to ${interests[0]} here that I find fascinating.`
          : "Let me tell you the human story behind this one, because it's wild.";
        const gen = voiceManager.current.beginNewVoiceResponse();
        voiceManager.current.enqueueSentence(hint, gen);
        voiceManager.current.finalizeQueue();
      },

      onFatigueCheck: () => {
        if (!voiceManager.current || !session.isVoiceTourActive) return;
        const gen = voiceManager.current.beginNewVoiceResponse();
        voiceManager.current.enqueueSentence(
          "We've been at this a while — want to take a break and come back? I'll remember where we left off.",
          gen
        );
        voiceManager.current.finalizeQueue();
      },

      onShareConnection: (artwork: ArtworkInfo, interest: string) => {
        if (!voiceManager.current || !session.isVoiceTourActive) return;
        const gen = voiceManager.current.beginNewVoiceResponse();
        voiceManager.current.enqueueSentence(
          `Actually — there's something here I think you'll appreciate given your interest in ${interest}.`,
          gen
        );
        voiceManager.current.finalizeQueue();
      },

      onReturnVisit: (artwork: ArtworkInfo, previousTopics: string[]) => {
        if (!voiceManager.current || !session.isVoiceTourActive) return;
        const gen = voiceManager.current.beginNewVoiceResponse();
        const text = previousTopics.length > 0
          ? `Back to "${artwork.title}" — we were talking about ${previousTopics[0]} last time. Want to pick up there, or explore something new?`
          : `You're back at "${artwork.title}". Anything you want to revisit, or look at it fresh?`;
        voiceManager.current.enqueueSentence(text, gen);
        voiceManager.current.finalizeQueue();
      },

      onInterrupt: (transcript: string) => {
        if (voiceManager.current) {
          voiceManager.current.stopSpeaking();
        }
        if (transcript.trim()) {
          handleVoiceInputRef.current(transcript);
        }
      },
    });

    return () => {
      cortexRef.current?.destroy();
      cortexRef.current = null;
    };
  }, [visitorProfile?.visitor_id]); // only recreate when visitor changes

  const handleStartVoiceTour = async () => {
    if (!voiceManager.current || !currentArtwork) return;
    // Must be called synchronously within the click gesture BEFORE any awaits.
    // This registers the audio element as gesture-unlocked on iOS Safari so
    // subsequent play() calls (after await fetch('/api/tts')) succeed.
    voiceManager.current.unlockAudio();
    setIsInitializingVoice(true);
    try {
      await voiceManager.current.startTour(currentArtwork.id, currentArtwork.title, visitorName);
      session.startVoiceTour();
    } catch (error) {
      console.error('[PersistentChat] Failed to start voice tour:', error);
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
    if (!transcript.trim()) return;

    // If a transition is in progress, the visitor has moved on mentally.
    // Abort the transition and treat their input as about the NEW artwork.
    if (transitionManager.current?.isTransitioning()) {
      console.log('[PersistentChat] Voice input during transition — aborting, treating as new artwork input');
      transitionManager.current.abortTransition();
      if (voiceManager.current) {
        voiceManager.current.stopSpeaking();
        voiceManager.current.clearQueueKeepCurrent();
      }
    }

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

  // Fire-and-forget: condense older messages into a 1-sentence summary.
  // Called after every 5th AI response. Never blocks the user's response path.
  const MESSAGES_PER_SUMMARY = 5;  // how many raw messages to keep before compressing
  const RAW_KEEP = 4;               // always keep the N most recent messages raw

  const maybeCompressHistory = (allArtworkMessages: Array<{ role: string; content: string }>) => {
    const total = allArtworkMessages.length;
    // Compress when we have more than RAW_KEEP messages beyond what's already summarised
    const unsummarised = total - summaryMessageCountRef.current;
    if (unsummarised < RAW_KEEP + MESSAGES_PER_SUMMARY) return;

    // Messages to compress: everything except the last RAW_KEEP
    const toCompress = allArtworkMessages.slice(summaryMessageCountRef.current, total - RAW_KEEP);
    if (toCompress.length === 0) return;

    // Mark them as processed so we don't recompress on the next call
    summaryMessageCountRef.current = total - RAW_KEEP;

    fetch('/api/chat/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toCompress, artworkTitle: currentArtwork?.title }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.summary) {
          // Append to existing summary (in case there were previous rounds)
          conversationSummaryRef.current = conversationSummaryRef.current
            ? `${conversationSummaryRef.current} ${data.summary}`
            : data.summary;
        }
      })
      .catch(() => { /* non-critical — silently ignore */ });
  };

  const triggerDeepUpdateIfNeeded = (userMessage: string, assistantMessage: string) => {
    if (!visitorProfile) return;
    assistantMessageCountRef.current += 1;
    if (assistantMessageCountRef.current % 5 !== 0) return;

    const recentHistory = [
      ...session.messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
      { role: 'assistant' as const, content: assistantMessage },
    ];

    fetch('/api/acquaintance/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: visitorProfile, recentHistory }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.updatedProfile) updateVisitorProfile(data.updatedProfile);
      })
      .catch(err => console.error('[AcquaintanceUpdate] error:', err));
  };

  const sendMessageToAI = async (content: string, isVoiceInput: boolean) => {
    // Speak reply whenever voice tour is active, regardless of whether the input
    // was typed or spoken (user expectation: always hear the answer in voice mode).
    const useStreaming = session.isVoiceTourActive && !!voiceManager.current;
    setIsLoading(true);

    // Abort any in-flight stream from a previous call (e.g., user interrupted)
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }

    const artworkMessages = session.messages
      .filter(m => m.artworkId === artworkId)
      .map(m => ({ role: m.role, content: m.content }));

    // Pass only the last 4 raw messages — older turns live in the rolling summary
    const conversationHistory = artworkMessages.slice(-4);
    const conversationSummary = conversationSummaryRef.current;

    // Background compression — fires after every 5th message beyond the raw window
    maybeCompressHistory(artworkMessages);

    try {
      if (visitorProfile) {
        const updated = applyHeuristics(visitorProfile, content);
        updateVisitorProfile(updated);
      }

      const abort = new AbortController();
      let voiceGen: number | undefined;
      if (useStreaming && voiceManager.current) {
        voiceGen = voiceManager.current.beginNewVoiceResponse();
        streamAbortRef.current = abort;
      }

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
          conversationSummary: conversationSummary || undefined,
          voice: session.isVoiceTourActive,
          visitorProfile: visitorProfile || null,
        }),
        signal: useStreaming ? abort.signal : undefined,
      });

      if (!response.ok) throw new Error(`Chat API error: ${response.status}`);

      if (useStreaming && voiceManager.current) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let sentenceBuffer = '';

        // Extract complete sentences (ending in .!? followed by space).
        function extractSentences(buf: string): [string[], string] {
          const sentences: string[] = [];
          let rest = buf;
          const re = /^([\s\S]*?[.!?]['"]?)\s+/;
          let m;
          while ((m = re.exec(rest)) !== null) {
            const s = m[1].trim();
            if (s) sentences.push(s);
            rest = rest.slice(m[0].length);
          }
          return [sentences, rest];
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done || abort.signal.aborted) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            sentenceBuffer += chunk;

            const [sentences, remaining] = extractSentences(sentenceBuffer);
            sentenceBuffer = remaining;
            for (const sentence of sentences) {
              if (!abort.signal.aborted) {
                voiceManager.current!.enqueueSentence(sentence, voiceGen);
                // Track for transition system
                if (transitionManager.current) {
                  transitionManager.current.appendSpoken(sentence);
                  transitionManager.current.incrementSentenceCount();
                }
              }
            }
          }
        } catch (streamErr) {
          if (!abort.signal.aborted) {
            console.error('[PersistentChat] Stream read error:', streamErr);
          }
        }

        // Flush any remaining partial sentence
        if (sentenceBuffer.trim() && !abort.signal.aborted) {
          voiceManager.current.enqueueSentence(sentenceBuffer.trim(), voiceGen);
          if (transitionManager.current) {
            transitionManager.current.appendSpoken(sentenceBuffer.trim());
            transitionManager.current.incrementSentenceCount();
          }
        }
        if (!abort.signal.aborted) {
          voiceManager.current.finalizeQueue();
        }

        streamAbortRef.current = null;
        setIsLoading(false);

        if (fullText.trim() && !abort.signal.aborted) {
          session.addMessage({
            id: `ai-${Date.now()}`,
            content: fullText.trim(),
            isUser: false,
            role: 'assistant',
            timestamp: new Date(),
            artworkId,
          });
          triggerDeepUpdateIfNeeded(content, fullText.trim());
          // resumeListening() is called automatically by runSentenceQueue when the queue empties
        }

      } else {
        const data = await response.json();

        if (data.actualMuseumId && data.actualMuseumId !== actualMuseumId) {
          setActualMuseumId(data.actualMuseumId);
        }

        const assistantContent = data.response || 'I apologize, but I received an empty response. Please try again.';

        // Track spokenSoFar even in text mode (for transition context)
        if (transitionManager.current) {
          transitionManager.current.appendSpoken(assistantContent);
          transitionManager.current.incrementSentenceCount();
        }

        session.addMessage({
          id: `ai-${Date.now()}`,
          content: assistantContent,
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
        triggerDeepUpdateIfNeeded(content, assistantContent);
        setIsLoading(false);
      }

    } catch (error) {
      console.error('[PersistentChat] Chat error:', error);
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
          {voiceSupported && !thumbZoneVoice && (
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
          {noisySuggestion && (
            <NoisyEnvironmentBanner
              suggestion={noisySuggestion}
              onDismiss={() => setNoisySuggestion(null)}
            />
          )}
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
                <p><span style={{ color: 'rgba(201,168,76,0.5)' }}>Curator Note of the Day:</span> {currentArtwork.curator_notes.length} available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== INPUT ==================== */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(201,168,76,0.1)', background: '#0D0A07' }}>
        <div style={{ padding: `12px 16px ${thumbZoneVoice ? 'calc(env(safe-area-inset-bottom) + 88px)' : '12px'}` }}>
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

      {/* ==================== THUMB-ZONE VOICE BUTTON (mobile only) ==================== */}
      {thumbZoneVoice && voiceSupported && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom) + 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}>
          <button
            onClick={session.isVoiceTourActive ? handleStopVoiceTour : handleStartVoiceTour}
            disabled={!currentArtwork || isInitializingVoice}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: session.isVoiceTourActive
                ? 'rgba(166,60,60,0.4)'
                : 'rgba(13,10,7,0.9)',
              border: `1px solid ${session.isVoiceTourActive ? 'rgba(166,60,60,0.6)' : 'rgba(201,168,76,0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (!currentArtwork || isInitializingVoice) ? 'not-allowed' : 'pointer',
              opacity: (!currentArtwork || isInitializingVoice) ? 0.5 : 1,
              boxShadow: session.isVoiceTourActive
                ? '0 0 24px rgba(166,60,60,0.4), 0 4px 16px rgba(0,0,0,0.6)'
                : '0 0 24px rgba(201,168,76,0.25), 0 4px 16px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}
          >
            {isInitializingVoice
              ? <Loader2 size={24} color="rgba(201,168,76,0.8)" style={{ animation: 'spin 1s linear infinite' }} />
              : session.isVoiceTourActive
                ? <MicOff size={24} color="rgba(220,120,120,0.9)" />
                : <Mic size={24} color="rgba(201,168,76,0.8)" />
            }
          </button>
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '8px',
            letterSpacing: '0.2em',
            color: session.isVoiceTourActive ? 'rgba(220,120,120,0.7)' : 'rgba(201,168,76,0.5)',
          }}>
            {isInitializingVoice ? 'STARTING' : session.isVoiceTourActive ? 'END TOUR' : 'VOICE TOUR'}
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
