'use client';

/**
 * AcquaintanceIntro — Voice-First Onboarding
 *
 * Spec: docs/text instructions 4
 * Flow:
 *   Phase 1 — Voice conversation (3 turns): docent speaks → visitor speaks → repeat
 *   Phase 2 — Tap screen: "What are you into?" (interests)
 *   Phase 3 — Tap screen: "Pick your vibe" (communication style)
 *   Phase 4 — Voice handoff: docent says something energetic, then complete
 *
 * Voice pipeline: TTS via /api/tts → play audio → Web Speech API STT → API turn
 * Text fallback available throughout for accessibility.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VisitorProfile, createProfile, mergeProfilePatch } from '@/lib/acquaintance/profile';

// ── Types ──────────────────────────────────────────────────────────────────────

type VoicePhase = 'voice-qa' | 'tap-interests' | 'tap-vibe' | 'handoff' | 'complete';
type VoiceState = 'idle' | 'speaking' | 'listening' | 'processing';

interface AcquaintanceIntroProps {
  visitorName: string | null;
  docentName: string | null;
  onComplete: (profile: VisitorProfile) => void;
}

// ── Interest tiles ─────────────────────────────────────────────────────────────

const INTEREST_TILES = [
  { label: 'Sports',       icon: '⚽', domain: 'sports' },
  { label: 'Cooking',      icon: '🍳', domain: 'cooking' },
  { label: 'Gaming',       icon: '🎮', domain: 'gaming' },
  { label: 'Music',        icon: '🎵', domain: 'music' },
  { label: 'Tech',         icon: '💻', domain: 'technology' },
  { label: 'Film',         icon: '🎬', domain: 'film' },
  { label: 'Fashion',      icon: '👗', domain: 'fashion' },
  { label: 'History',      icon: '📜', domain: 'history' },
  { label: 'Science',      icon: '🔬', domain: 'science' },
  { label: 'Architecture', icon: '🏛️', domain: 'architecture' },
  { label: 'Travel',       icon: '✈️', domain: 'travel' },
  { label: 'Cars',         icon: '🚗', domain: 'cars' },
  { label: 'Business',     icon: '📈', domain: 'business' },
  { label: 'Books',        icon: '📚', domain: 'literature' },
];

const VIBE_OPTIONS = [
  {
    key: 'casual',
    label: 'Keep it real',
    desc: 'Casual, maybe a bit cheeky. Don\'t hold back.',
    formality: 0.2,
    humor_tolerance: 0.8,
    sarcasm_appreciation: true,
    humor_style: 'dry',
  },
  {
    key: 'balanced',
    label: 'Somewhere in the middle',
    desc: 'Friendly and smart. No need to be stiff.',
    formality: 0.5,
    humor_tolerance: 0.6,
    sarcasm_appreciation: false,
    humor_style: 'warm',
  },
  {
    key: 'formal',
    label: 'Keep it classy',
    desc: 'Polished and articulate. I appreciate the finer things.',
    formality: 0.8,
    humor_tolerance: 0.3,
    sarcasm_appreciation: false,
    humor_style: null,
  },
] as const;

// ── TTS helper ─────────────────────────────────────────────────────────────────

async function speakText(
  text: string,
  audioRef?: React.MutableRefObject<HTMLAudioElement | null>
): Promise<void> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('TTS failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    if (audioRef) audioRef.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (audioRef) audioRef.current = null;
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(url);
      if (audioRef) audioRef.current = null;
      reject(e);
    };
    audio.play().catch(reject);
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AcquaintanceIntro({ visitorName, docentName, onComplete }: AcquaintanceIntroProps) {
  const [phase, setPhase] = useState<VoicePhase>('voice-qa');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [docentText, setDocentText] = useState('');
  const [profile, setProfile] = useState<VisitorProfile>(() => createProfile(visitorName));
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Tap state
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  // Text fallback
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');

  // Voice support detection
  const [sttSupported, setSttSupported] = useState(false);
  // Refs so async callbacks always see the latest values (avoids stale closures)
  const sttSupportedRef = useRef(false);
  const handleUserResponseRef = useRef<(t: string) => Promise<void>>(async () => {});
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const hasInitialized = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Adaptive silence threshold: 2s for onboarding (longer pauses are normal mid-sentence)
  const SILENCE_THRESHOLD_MS = 2000;
  const MAX_LISTEN_MS = 30000; // safety cutoff

  useEffect(() => {
    const supported = !!(
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
    setSttSupported(supported);
    sttSupportedRef.current = supported;
    if (!supported) setShowTextInput(true);
  }, []);

  // ── Start intro on mount ───────────────────────────────────────────────────

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    startFirstTurn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Unmount cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Stop any playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      // Stop speech recognition
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
      // Clear all timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, []);

  // ── Voice: speak + listen cycle ───────────────────────────────────────────

  // Uses ref so stale closures in the mount effect always call the latest version
  const speakAndListenRef = useRef<(text: string) => Promise<void>>(async () => {});

  const speakAndListen = useCallback(async (text: string) => {
    setVoiceState('speaking');
    setDocentText(text);
    try {
      await speakText(text, currentAudioRef);
    } catch {
      // TTS failed — text is still visible, proceed
    }
    setVoiceState('listening');
    setShowTextInput(true);
    if (sttSupportedRef.current) {
      startListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // no deps needed — uses refs

  // Keep refs current on every render so async callbacks never go stale
  speakAndListenRef.current = speakAndListen;

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    // continuous = true so the browser doesn't auto-stop on mid-sentence pauses
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let hasSpeech = false;

    const clearSilenceTimer = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    const armSilenceTimer = () => {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        // Silence threshold reached — stop and submit whatever we have
        try { recognition.stop(); } catch { /* already stopped */ }
      }, SILENCE_THRESHOLD_MS);
    };

    // Safety cutoff — stop listening after MAX_LISTEN_MS regardless
    const maxTimer = setTimeout(() => {
      try { recognition.stop(); } catch { /* already stopped */ }
    }, MAX_LISTEN_MS);

    recognition.onresult = (e: any) => {
      let newFinal = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          newFinal += e.results[i][0].transcript;
        }
      }
      if (newFinal) {
        finalTranscript += ' ' + newFinal;
        hasSpeech = true;
      }
      // Arm/reset silence timer only after speech is actually detected.
      // This prevents the timer from firing before the visitor starts speaking.
      if (hasSpeech) {
        armSilenceTimer();
      }
    };

    recognition.onerror = () => {
      clearSilenceTimer();
      clearTimeout(maxTimer);
      setShowTextInput(true);
      setVoiceState('idle');
    };

    recognition.onend = () => {
      clearSilenceTimer();
      clearTimeout(maxTimer);
      const transcript = finalTranscript.trim();
      if (transcript && hasSpeech) {
        // Use ref so we always call the latest handleUserResponse (avoids stale closure)
        handleUserResponseRef.current(transcript);
      } else {
        // No speech detected — show text fallback
        setVoiceState(prev => {
          if (prev === 'listening') {
            setShowTextInput(true);
            return 'idle';
          }
          return prev;
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
  }, []);

  // ── Turn logic ─────────────────────────────────────────────────────────────

  async function startFirstTurn() {
    setVoiceState('processing');
    try {
      const res = await fetch('/api/acquaintance/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: visitorName ? `Hi, I'm ${visitorName}.` : 'Hi.',
          conversationHistory: [],
          profile,
          docentName,
          visitorName,
        }),
      });
      const data = await res.json();
      if (data.nextMessage) {
        setProfile(data.updatedProfile);
        setConversationHistory([{ role: 'assistant', content: data.nextMessage }]);
        // Use ref so we always call the latest speakAndListen (avoids stale closure)
        await speakAndListenRef.current(data.nextMessage);
      }
    } catch {
      const fallback = `${visitorName ? `Good to meet you, ${visitorName}.` : 'Welcome.'} What brings you in today — are you here for something specific, or just exploring?`;
      setDocentText(fallback);
      setConversationHistory([{ role: 'assistant', content: fallback }]);
      setVoiceState('listening');
      setShowTextInput(true);
    }
  }

  async function handleUserResponse(transcript: string) {
    stopListening();
    setVoiceState('processing');
    setShowTextInput(false);
    setTextInput('');

    const newHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...conversationHistory,
      { role: 'user', content: transcript },
    ];

    try {
      const res = await fetch('/api/acquaintance/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: transcript,
          conversationHistory: conversationHistory,
          profile,
          docentName,
          visitorName,
        }),
      });
      const data = await res.json();

      setProfile(data.updatedProfile);

      const updatedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...newHistory,
        { role: 'assistant', content: data.nextMessage },
      ];
      setConversationHistory(updatedHistory);

      // Speak docent's response, then check if we need a tap screen
      setVoiceState('speaking');
      setDocentText(data.nextMessage);
      try { await speakText(data.nextMessage, currentAudioRef); } catch { /* ignore */ }

      if (data.tapScreen === 'interests') {
        setPhase('tap-interests');
        setVoiceState('idle');
      } else if (data.tapScreen === 'vibe') {
        setPhase('tap-vibe');
        setVoiceState('idle');
      } else if (data.isComplete) {
        setPhase('complete');
        setVoiceState('idle');
        onComplete(data.updatedProfile);
      } else {
        // Continue voice loop — use refs for current values
        setVoiceState('listening');
        setShowTextInput(true);
        if (sttSupportedRef.current) startListening();
      }
    } catch {
      setVoiceState('listening');
      setShowTextInput(true);
    }
  }

  // Keep ref current so startListening's onresult always calls latest version
  handleUserResponseRef.current = handleUserResponse;

  // ── Tap screen handlers ────────────────────────────────────────────────────

  function toggleInterest(domain: string) {
    setSelectedInterests(prev =>
      prev.includes(domain) ? prev.filter(i => i !== domain) : [...prev, domain]
    );
  }

  async function submitInterests() {
    if (selectedInterests.length === 0) return;

    // Merge interests directly into profile (no extraction needed)
    const interestPatch: Partial<VisitorProfile> = {
      personality: {
        ...profile.personality,
        interests: selectedInterests,
        analogy_domains: selectedInterests,
      },
    };
    const patched = mergeProfilePatch(profile, interestPatch);
    setProfile(patched);

    const userMessage = `I'm into: ${selectedInterests.join(', ')}.`;
    setPhase('voice-qa');
    setVoiceState('processing');

    const newHistory = [...conversationHistory, { role: 'user' as const, content: userMessage }];

    try {
      const res = await fetch('/api/acquaintance/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          conversationHistory,
          profile: patched,
          docentName,
          visitorName,
        }),
      });
      const data = await res.json();
      setProfile(data.updatedProfile);
      setConversationHistory([...newHistory, { role: 'assistant', content: data.nextMessage }]);

      setVoiceState('speaking');
      setDocentText(data.nextMessage);
      try { await speakText(data.nextMessage, currentAudioRef); } catch { /* ignore */ }

      if (data.tapScreen === 'vibe') {
        setPhase('tap-vibe');
        setVoiceState('idle');
      } else if (data.isComplete) {
        onComplete(data.updatedProfile);
      } else {
        // AI asked a follow-up question about their interests — listen for the answer
        setPhase('voice-qa');
        setVoiceState('listening');
        setShowTextInput(true);
        if (sttSupportedRef.current) startListening();
      }
    } catch {
      setPhase('tap-vibe');
      setVoiceState('idle');
    }
  }

  async function submitVibe(vibeKey: string) {
    const vibe = VIBE_OPTIONS.find(v => v.key === vibeKey);
    if (!vibe) return;

    const vibePatch: Partial<VisitorProfile> = {
      communication: {
        ...profile.communication,
        formality: vibe.formality,
        humor_tolerance: vibe.humor_tolerance,
        sarcasm_appreciation: vibe.sarcasm_appreciation,
        humor_style: vibe.humor_style ?? null,
      },
    };
    const patched = mergeProfilePatch(profile, vibePatch);
    setProfile(patched);

    const userMessage = `I want: ${vibe.label}. ${vibe.desc}`;
    setPhase('voice-qa');
    setVoiceState('processing');

    const newHistory = [...conversationHistory, { role: 'user' as const, content: userMessage }];

    try {
      const res = await fetch('/api/acquaintance/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          conversationHistory,
          profile: patched,
          docentName,
          visitorName,
        }),
      });
      const data = await res.json();
      const finalProfile = data.updatedProfile;
      setProfile(finalProfile);
      setConversationHistory([...newHistory, { role: 'assistant', content: data.nextMessage }]);

      setVoiceState('speaking');
      setDocentText(data.nextMessage);
      try { await speakText(data.nextMessage, currentAudioRef); } catch { /* ignore */ }

      setVoiceState('idle');
      setPhase('handoff');
      // Short delay then complete
      setTimeout(() => onComplete(finalProfile), 2000);
    } catch {
      onComplete(patched);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '380px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: '10px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.6)' }}>
          ◆ &nbsp; {docentName ?? 'DOCENT'} &nbsp; ◆
        </p>
      </div>

      {/* ── Voice QA phase ── */}
      {(phase === 'voice-qa' || phase === 'handoff') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>

          {/* Docent text bubble */}
          {docentText && (
            <div style={{
              maxWidth: '100%',
              padding: '16px 20px',
              background: 'rgba(201,168,76,0.07)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: '4px',
              fontFamily: 'Raleway, sans-serif',
              fontSize: '15px',
              fontWeight: 300,
              color: '#F2E8D5',
              lineHeight: 1.7,
              textAlign: 'center',
            }}>
              {docentText}
            </div>
          )}

          {/* Voice state indicator */}
          <VoiceIndicator state={voiceState} sttSupported={sttSupported} />

          {/* Processing spinner */}
          {voiceState === 'processing' && (
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.4)' }}>
              ···
            </p>
          )}

          {/* Text fallback input */}
          {(voiceState === 'listening' || showTextInput) && phase === 'voice-qa' && (
            <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && textInput.trim()) handleUserResponse(textInput.trim()); }}
                placeholder={sttSupported ? 'Or type your response…' : 'Type your response…'}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'rgba(242,232,213,0.05)',
                  border: '1px solid rgba(201,168,76,0.25)',
                  borderRadius: '4px',
                  fontFamily: 'Raleway, sans-serif',
                  fontSize: '13px',
                  color: '#F2E8D5',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => { if (textInput.trim()) handleUserResponse(textInput.trim()); }}
                disabled={!textInput.trim()}
                style={{
                  padding: '10px 16px',
                  background: textInput.trim() ? '#C9A84C' : 'rgba(201,168,76,0.15)',
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: 'Cinzel, serif',
                  fontSize: '11px',
                  color: textInput.trim() ? '#0D0A07' : 'rgba(201,168,76,0.3)',
                  cursor: textInput.trim() ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}
              >
                →
              </button>
            </div>
          )}

          {/* Show text input toggle */}
          {voiceState === 'listening' && sttSupported && !showTextInput && (
            <button
              onClick={() => { stopListening(); setShowTextInput(true); setVoiceState('idle'); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Raleway, sans-serif', fontSize: '11px',
                color: 'rgba(242,232,213,0.25)', letterSpacing: '0.05em',
                textDecoration: 'underline',
              }}
            >
              type instead
            </button>
          )}
        </div>
      )}

      {/* ── Tap: Interests ── */}
      {phase === 'tap-interests' && (
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 300,
            color: '#F2E8D5', textAlign: 'center', marginBottom: '6px',
          }}>
            What are you into?
          </p>
          <p style={{
            fontFamily: 'Raleway, sans-serif', fontSize: '11px', color: 'rgba(242,232,213,0.35)',
            textAlign: 'center', marginBottom: '20px', letterSpacing: '0.05em',
          }}>
            Tap everything that applies — I'll use it to make this relevant to you.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            {INTEREST_TILES.map(({ label, icon, domain }) => {
              const selected = selectedInterests.includes(domain);
              return (
                <button
                  key={domain}
                  onClick={() => toggleInterest(domain)}
                  style={{
                    padding: '8px 14px',
                    background: selected ? 'rgba(201,168,76,0.2)' : 'rgba(242,232,213,0.04)',
                    border: `1px solid ${selected ? 'rgba(201,168,76,0.7)' : 'rgba(201,168,76,0.15)'}`,
                    borderRadius: '4px',
                    fontFamily: 'Raleway, sans-serif',
                    fontSize: '13px',
                    color: selected ? '#C9A84C' : 'rgba(242,232,213,0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <span>{icon}</span>{label}
                </button>
              );
            })}
          </div>

          <button
            onClick={submitInterests}
            disabled={selectedInterests.length === 0}
            style={{
              display: 'block', width: '100%', padding: '14px',
              background: selectedInterests.length > 0 ? '#C9A84C' : 'rgba(201,168,76,0.15)',
              border: 'none', borderRadius: '4px',
              fontFamily: 'Cinzel, serif', fontSize: '11px', letterSpacing: '0.25em',
              color: selectedInterests.length > 0 ? '#0D0A07' : 'rgba(201,168,76,0.3)',
              cursor: selectedInterests.length > 0 ? 'pointer' : 'default',
              transition: 'all 0.2s', fontWeight: 600,
            }}
          >
            {selectedInterests.length > 0 ? `THAT'S ME →` : 'SELECT AT LEAST ONE'}
          </button>
        </div>
      )}

      {/* ── Tap: Vibe ── */}
      {phase === 'tap-vibe' && (
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 300,
            color: '#F2E8D5', textAlign: 'center', marginBottom: '6px',
          }}>
            How do you want me to talk to you?
          </p>
          <p style={{
            fontFamily: 'Raleway, sans-serif', fontSize: '11px', color: 'rgba(242,232,213,0.35)',
            textAlign: 'center', marginBottom: '24px', letterSpacing: '0.05em',
          }}>
            Pick your vibe.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {VIBE_OPTIONS.map(vibe => {
              const selected = selectedVibe === vibe.key;
              return (
                <button
                  key={vibe.key}
                  onClick={() => { setSelectedVibe(vibe.key); submitVibe(vibe.key); }}
                  style={{
                    padding: '16px 20px',
                    background: selected ? 'rgba(201,168,76,0.15)' : 'rgba(242,232,213,0.03)',
                    border: `1px solid ${selected ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.15)'}`,
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <p style={{
                    fontFamily: 'Cinzel, serif', fontSize: '12px', letterSpacing: '0.1em',
                    color: selected ? '#C9A84C' : '#F2E8D5', marginBottom: '4px',
                  }}>
                    {vibe.label}
                  </p>
                  <p style={{
                    fontFamily: 'Raleway, sans-serif', fontSize: '12px', fontWeight: 300,
                    color: 'rgba(242,232,213,0.45)',
                  }}>
                    {vibe.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Voice indicator component ──────────────────────────────────────────────────

function VoiceIndicator({ state, sttSupported }: { state: VoiceState; sttSupported: boolean }) {
  if (state === 'idle' || state === 'processing') return null;

  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {/* Animated ring */}
      <div style={{ position: 'relative', width: '56px', height: '56px' }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `2px solid ${isSpeaking ? 'rgba(201,168,76,0.6)' : 'rgba(242,232,213,0.3)'}`,
          animation: isSpeaking ? 'pulse-ring 1.2s ease-in-out infinite' : isListening ? 'pulse-ring 0.8s ease-in-out infinite' : 'none',
        }} />
        <div style={{
          position: 'absolute', inset: '8px', borderRadius: '50%',
          background: isSpeaking ? 'rgba(201,168,76,0.15)' : 'rgba(242,232,213,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSpeaking ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.8)" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(242,232,213,0.6)" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </div>
      </div>
      <p style={{
        fontFamily: 'Cinzel, serif', fontSize: '9px', letterSpacing: '0.3em',
        color: isSpeaking ? 'rgba(201,168,76,0.5)' : 'rgba(242,232,213,0.3)',
      }}>
        {isSpeaking ? 'SPEAKING' : sttSupported ? 'LISTENING' : ''}
      </p>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
