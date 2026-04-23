// src/lib/voice/DocentVoiceManager.ts
/**
 * Docent Voice Manager
 *
 * STT:  VoicePipeline (Deepgram WebSocket via AudioPreFilter)
 * TTS:  OpenAI TTS → HTMLAudioElement
 * Mode: dormant → speaking (greeting) → listening ↔ thinking ↔ speaking
 */

import { VoicePipeline } from '@/voice/pipeline';

export type VoiceMode = 'dormant' | 'listening' | 'thinking' | 'speaking';

/**
 * Module-level lock — prevents concurrent voice tours from multiple mounted
 * PersistentChatInterface instances (mobile + tablet layouts are both in the
 * React tree simultaneously; CSS hides one but both are mounted).
 */
let _globalTourActive = false;

export interface VoiceConfig {
  autoStart?: boolean;
  silenceTimeout?: number;
  language?: string;
  voice?: string;
}

export class DocentVoiceManager {
  private mode: VoiceMode = 'dormant';
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private unlockEl: HTMLAudioElement | null = null;

  private silenceTimer: NodeJS.Timeout | null = null;
  private silenceTimeout: number = 30000;

  private onModeChange?: (mode: VoiceMode) => void;
  private onTranscript?: (text: string, isFinal: boolean) => void;
  private onSpeechEnd?: () => void;
  private onError?: (error: string) => void;
  private onNoisyEnvironmentCb?: (suggestion: string) => void;
  private onSilenceCb?: (duration: number) => void;

  private currentArtwork: { id: string; title: string } | null = null;

  // Sentence queue — speaks sentence-by-sentence as text streams in
  private sentenceQueue: string[] = [];
  private isProcessingQueue = false;
  private queueFinalized = false;

  private silenceOffered = false;
  private spokenSentenceCount = 0;
  private responseGeneration = 0;
  private queueClearGeneration = 0;

  // Final-transcript debounce — Deepgram fires isFinal on every sentence-length
  // pause within a single thought. We buffer consecutive finals and flush them as
  // ONE combined utterance after 1500 ms of silence, preventing fragmented messages.
  private finalBuffer: string[] = [];
  private finalDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly FINAL_DEBOUNCE_MS = 1500;

  // Voice isolation pipeline (Deepgram-backed)
  private pipeline: VoicePipeline | null = null;
  private pipelineMode: 'introduction' | 'tour' = 'tour';

  // Tracks whether THIS instance holds the module-level lock
  private _ownsGlobalLock = false;

  constructor(config: VoiceConfig = {}) {
    this.silenceTimeout = config.silenceTimeout || 30000;
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
    } else {
      throw new Error('DocentVoiceManager requires browser environment');
    }
  }

  // ── Pipeline transcript handler ──────────────────────────────────────────────

  /**
   * Central handler for every transcript event from Deepgram.
   * Wired to pipeline.onTranscript after pipeline initialization.
   */
  private handleIncomingTranscript(transcript: string, isFinal: boolean): void {
    console.log(`[Voice] ${isFinal ? 'Final' : 'Interim'}: "${transcript}"`);

    if (this.mode === 'speaking') {
      // Interruption: ONLY fire on final transcripts with substantive content.
      // Interim transcripts while speaking are ignored — they change word-by-word
      // and would abort the in-flight chat request on every partial update.
      if (isFinal) {
        const FILLERS = new Set(['yeah', 'yes', 'no', 'uh', 'um', 'hmm', 'ah', 'oh', 'ok', 'okay', 'well', 'mm', 'mhm']);
        const words = transcript.trim().toLowerCase().split(/\s+/);
        const substantive = words.filter(w => !FILLERS.has(w.replace(/[.,!?]/g, '')));
        if (substantive.length >= 2) {
          console.log('[Voice] 🛑 INTERRUPTION!');
          this.handleInterruption(transcript, true);
          return;
        }
      }
      // Not a real interruption — ignore while docent is speaking
      return;
    }

    if (transcript.trim().length > 0) {
      this.silenceOffered = false;
    }

    this.resetSilenceTimer();

    if (isFinal && transcript.trim().length > 0 && this.mode === 'listening') {
      // Buffer this final and wait for more — Deepgram sometimes fires multiple
      // finals for a single continuous thought separated by short pauses.
      // Show accumulated text as interim in the UI while we wait.
      this.accumulateFinal(transcript);
    } else {
      // Interim transcripts pass through immediately for live UI display.
      // Finals that arrive outside listening mode (e.g. mode switched) also pass through.
      if (this.onTranscript) {
        this.onTranscript(transcript, isFinal);
      }
    }
  }

  private accumulateFinal(transcript: string): void {
    this.finalBuffer.push(transcript.trim());
    const accumulated = this.finalBuffer.join(' ');

    // Show the growing accumulated text as an interim so the user sees it building up
    if (this.onTranscript) {
      this.onTranscript(accumulated, false);
    }

    // Reset the debounce window
    if (this.finalDebounceTimer) {
      clearTimeout(this.finalDebounceTimer);
      this.finalDebounceTimer = null;
    }

    this.finalDebounceTimer = setTimeout(() => {
      this.finalDebounceTimer = null;
      if (this.mode !== 'listening' || this.finalBuffer.length === 0) {
        this.finalBuffer = [];
        return;
      }
      const fullText = this.finalBuffer.join(' ');
      this.finalBuffer = [];
      console.log(`[Voice] ✅ Flushing buffered final: "${fullText.substring(0, 80)}"`);
      // Emit the combined text as the true final for PCI / Cortex to act on
      if (this.onTranscript) {
        this.onTranscript(fullText, true);
      }
      this.handleUserSpeech(fullText);
    }, this.FINAL_DEBOUNCE_MS);
  }

  public clearFinalBuffer(): void {
    if (this.finalDebounceTimer) {
      clearTimeout(this.finalDebounceTimer);
      this.finalDebounceTimer = null;
    }
    this.finalBuffer = [];
  }

  // ── Tour lifecycle ───────────────────────────────────────────────────────────

  async startTour(artworkId: string, artworkTitle: string, visitorName?: string | null): Promise<void> {
    // Prevent two instances (e.g. mobile + tablet PCI both mounted) from racing
    if (_globalTourActive) {
      console.warn('[Voice] startTour ignored — another voice tour instance is already active');
      return;
    }
    _globalTourActive = true;
    this._ownsGlobalLock = true;

    this.currentArtwork = { id: artworkId, title: artworkTitle };
    this.silenceOffered = false;

    console.log('[Voice] 🎬 Starting tour...');

    // Initialize pipeline (Deepgram)
    if (!this.pipeline) {
      try {
        this.pipeline = new VoicePipeline();
        this.pipeline.mode = this.pipelineMode;
        await this.pipeline.initialize();

        this.pipeline.onTranscript = (t, isFinal) => this.handleIncomingTranscript(t, isFinal);
        this.pipeline.onSpeechStarted = () => {
          // Deepgram detected speech start — useful for future barge-in optimisation
        };
      } catch (err) {
        console.warn('[Voice] Pipeline init failed, STT unavailable:', err);
        this.pipeline = null;
      }
    }

    try {
      await this.warmUpTTS();

      this.setMode('speaking');

      const greeting = this.generateGreeting(artworkTitle, visitorName);
      try {
        await this.speak(greeting);
        console.log('[Voice] ✅ Greeting done');
      } catch (error) {
        console.error('[Voice] ❌ Greeting failed:', error);
      }

      this.startListening();
    } catch (err) {
      // Release lock on unexpected failure so a retry is possible
      _globalTourActive = false;
      throw err;
    }
  }

  async onArtworkChange(newArtworkId: string, newArtworkTitle: string): Promise<void> {
    this.stopSpeaking();
    this.clearFinalBuffer();

    const previousArtwork = this.currentArtwork;
    this.currentArtwork = { id: newArtworkId, title: newArtworkTitle };

    this.setMode('speaking');
    this.pipeline?.setMode('tour');

    const transition = this.generateTransition(previousArtwork?.title, newArtworkTitle);
    await this.speak(transition);

    this.startListening();
  }

  stopTour(): void {
    if (this._ownsGlobalLock) {
      _globalTourActive = false;
      this._ownsGlobalLock = false;
    }
    this.stopListening();
    this.stopSpeaking();
    this.clearFinalBuffer();
    this.sentenceQueue = [];
    this.isProcessingQueue = false;
    this.queueFinalized = false;
    this.spokenSentenceCount = 0;
    this.clearSilenceTimer();
    this.setMode('dormant');
    this.currentArtwork = null;
    if (this.pipeline) { void this.pipeline.destroy(); this.pipeline = null; }
  }

  // ── Listening state ──────────────────────────────────────────────────────────
  // With Deepgram, the pipeline streams continuously once initialized.
  // startListening / stopListening manage mode state only.

  private startListening(): void {
    if (this.mode === 'dormant') {
      console.log('[Voice] Tour dormant, not starting listening');
      return;
    }
    if (this.mode === 'listening') {
      console.log('[Voice] Already listening');
      return;
    }
    console.log('[Voice] ✅ Listening');
    this.setMode('listening');
    this.resetSilenceTimer();
  }

  public stopListening(): void {
    this.clearSilenceTimer();
  }

  resumeListening(): void {
    if (this.mode === 'dormant') return;
    if (this.mode === 'listening') return;
    setTimeout(() => this.startListening(), 300);
  }

  // ── TTS ──────────────────────────────────────────────────────────────────────

  /**
   * Call this synchronously inside the user-gesture handler (e.g., "Start Tour" click)
   * BEFORE any awaits. iOS Safari requires audio.play() to originate from a user gesture;
   * after an await the gesture context is lost. Playing silence here unlocks the element
   * so all subsequent play() calls (after awaits) succeed on iOS.
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;
    if (!this.unlockEl) {
      this.unlockEl = new Audio();
      this.unlockEl.preload = 'auto';
    }
    // Minimal silent WAV — just enough to register the element as gesture-unlocked
    this.unlockEl.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    this.unlockEl.volume = 0;
    this.unlockEl.play().catch(() => { /* expected; gesture context is what matters */ });
  }

  async speak(text: string): Promise<void> {
    console.log(`[Voice] Speaking via OpenAI TTS: "${text.substring(0, 50)}..."`);
    this.stopSpeaking();
    this.setMode('speaking');
    if (this.pipeline) this.pipeline.onDocentSpeaking();

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error(`TTS API error: ${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return this.playAudioUrl(url);
  }

  private async playAudioUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Reuse the gesture-unlocked element so iOS Safari allows play() after awaits.
      // If unlockAudio() was called in the gesture handler, this element is already
      // registered as user-gesture-unlocked and won't require another gesture.
      if (!this.unlockEl) {
        this.unlockEl = new Audio();
      }
      const audio = this.unlockEl;
      audio.pause();
      audio.currentTime = 0;
      audio.src = url;
      audio.volume = 1;
      this.currentAudio = audio;

      const interruptPoll = setInterval(() => {
        if (this.currentAudio !== audio) {
          clearInterval(interruptPoll);
          URL.revokeObjectURL(url);
          if (this.pipeline) this.pipeline.onDocentSilent();
          resolve();
        }
      }, 50);

      audio.onended = () => {
        clearInterval(interruptPoll);
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        if (this.pipeline) this.pipeline.onDocentSilent();
        console.log('[Voice] TTS completed');
        resolve();
      };
      audio.onerror = (err) => {
        clearInterval(interruptPoll);
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        if (this.pipeline) this.pipeline.onDocentSilent();
        reject(err);
      };
      audio.play().catch(reject);
    });
  }

  async speakWithInterruption(text: string): Promise<'completed' | 'interrupted'> {
    console.log(`[Voice] 🔊🎧 With interruption: "${text.substring(0, 50)}..."`);

    return new Promise(async (resolve) => {
      let wasInterrupted = false;
      let speechComplete = false;

      const originalOnTranscript = this.pipeline?.onTranscript ?? null;

      const bargeinHandler = (transcript: string, isFinal: boolean) => {
        if (speechComplete || wasInterrupted) return;

        if (isFinal && transcript.trim().length > 3 && this.mode === 'speaking') {
          console.log(`[Voice] 🚨 INTERRUPTION: "${transcript}"`);
          wasInterrupted = true;
          this.stopSpeaking();
          this.setMode('thinking');
          if (this.onTranscript) this.onTranscript(transcript, true);
          if (this.pipeline) this.pipeline.onTranscript = originalOnTranscript;
          resolve('interrupted');
        }
      };

      if (this.pipeline) this.pipeline.onTranscript = bargeinHandler;

      try {
        await this.speak(text);
        speechComplete = true;
        if (this.pipeline) this.pipeline.onTranscript = originalOnTranscript;
        if (!wasInterrupted) resolve('completed');
      } catch {
        speechComplete = true;
        if (this.pipeline) this.pipeline.onTranscript = originalOnTranscript;
        if (!wasInterrupted) resolve('completed');
      }
    });
  }

  public stopSpeaking(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.synthesis?.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  // ── Sentence queue ───────────────────────────────────────────────────────────

  beginNewVoiceResponse(): number {
    if (this.mode === 'dormant') return this.responseGeneration;
    this.responseGeneration++;
    this.sentenceQueue = [];
    this.isProcessingQueue = false;
    this.queueFinalized = false;
    this.setMode('speaking');
    return this.responseGeneration;
  }

  enqueueSentence(text: string, generation?: number): void {
    if (this.mode === 'dormant') return;
    if (generation !== undefined && generation !== this.responseGeneration) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    this.queueFinalized = false;
    this.sentenceQueue.push(trimmed);
    if (!this.isProcessingQueue) {
      this.runSentenceQueue();
    }
  }

  finalizeQueue(): void {
    this.queueFinalized = true;
    if (!this.isProcessingQueue && this.sentenceQueue.length === 0 && this.mode === 'speaking') {
      this.resumeListening();
    }
  }

  clearQueueKeepCurrent(): void {
    this.sentenceQueue = [];
    this.queueClearGeneration++;
  }

  waitForCurrentSentence(maxMs = 4000): Promise<void> {
    return new Promise(resolve => {
      const isPlaying = () => !!(this.currentAudio) || this.synthesis.speaking;
      if (!isPlaying()) { resolve(); return; }
      const deadline = setTimeout(() => {
        clearInterval(poll);
        this.stopSpeaking();
        resolve();
      }, maxMs);
      const poll = setInterval(() => {
        if (!isPlaying()) {
          clearInterval(poll);
          clearTimeout(deadline);
          resolve();
        }
      }, 80);
    });
  }

  getSpokenSentenceCount(): number { return this.spokenSentenceCount; }
  resetSentenceCount(): void { this.spokenSentenceCount = 0; }
  isCurrentlyPlaying(): boolean { return !!(this.currentAudio) || this.isProcessingQueue; }
  getQueueLength(): number { return this.sentenceQueue.length; }

  waitForQueueDrain(maxMs = 15000, signal?: AbortSignal): Promise<'drained' | 'timeout' | 'aborted'> {
    return new Promise(resolve => {
      const isDrained = () =>
        this.sentenceQueue.length === 0 &&
        !this.currentAudio &&
        !this.synthesis.speaking &&
        !this.isProcessingQueue;

      if (isDrained()) { resolve('drained'); return; }

      const onAbort = () => {
        clearInterval(poll);
        clearTimeout(deadline);
        resolve('aborted');
      };

      const deadline = setTimeout(() => {
        clearInterval(poll);
        signal?.removeEventListener('abort', onAbort);
        this.stopSpeaking();
        resolve('timeout');
      }, maxMs);

      signal?.addEventListener('abort', onAbort, { once: true });

      const poll = setInterval(() => {
        if (isDrained()) {
          clearInterval(poll);
          clearTimeout(deadline);
          signal?.removeEventListener('abort', onAbort);
          resolve('drained');
        }
      }, 100);
    });
  }

  private async runSentenceQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    const myGeneration = this.responseGeneration;
    this.setMode('speaking');

    const fetchTTS = (text: string): Promise<string> =>
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then(r => {
        if (!r.ok) throw new Error(`TTS ${r.status}`);
        return r.blob();
      }).then(b => URL.createObjectURL(b));

    let nextAudioPromise: Promise<string> | null = null;

    while (this.sentenceQueue.length > 0 || nextAudioPromise !== null) {
      if (this.mode === 'dormant' || this.responseGeneration !== myGeneration) {
        if (nextAudioPromise) nextAudioPromise.then(u => URL.revokeObjectURL(u)).catch(() => {});
        nextAudioPromise = null;
        break;
      }

      const sentence = this.sentenceQueue.shift();
      const clearGenAtShift = this.queueClearGeneration;

      let currentAudioPromise: Promise<string>;
      if (nextAudioPromise !== null) {
        currentAudioPromise = nextAudioPromise;
        nextAudioPromise = null;
      } else if (sentence) {
        currentAudioPromise = fetchTTS(sentence);
      } else {
        break;
      }

      if (this.sentenceQueue.length > 0) {
        nextAudioPromise = fetchTTS(this.sentenceQueue[0]);
      }

      try {
        const url = await currentAudioPromise;
        // If queue was cleared while fetching (prefetch leak fix), discard this audio
        if (this.queueClearGeneration !== clearGenAtShift) {
          URL.revokeObjectURL(url);
          if (nextAudioPromise) nextAudioPromise.then(u => URL.revokeObjectURL(u)).catch(() => {});
          nextAudioPromise = null;
          break;
        }
        const modeNow = this.mode as VoiceMode;
        if (modeNow !== 'dormant' && this.responseGeneration === myGeneration) {
          await this.playAudioUrl(url);
          this.spokenSentenceCount++;
        } else {
          URL.revokeObjectURL(url);
          if (nextAudioPromise) nextAudioPromise.then(u => URL.revokeObjectURL(u)).catch(() => {});
          nextAudioPromise = null;
          break;
        }
      } catch (err) {
        console.error('[Voice] TTS error in queue:', err);
      }

      if (this.sentenceQueue.length > 0 && this.mode === 'speaking') {
        await new Promise(r => setTimeout(r, 80));
      }
    }

    this.isProcessingQueue = false;
    if (this.queueFinalized && this.mode === 'speaking' && this.responseGeneration === myGeneration) {
      this.resumeListening();
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  private handleUserSpeech(transcript: string): void {
    console.log(`[Voice] Processing: "${transcript}"`);
    if (this.mode !== 'speaking') {
      this.stopListening();
    }
    this.setMode('thinking');
  }

  private handleInterruption(transcript: string, isFinal: boolean): void {
    console.log(`[Voice] 🚨 Interrupted: "${transcript}"`);
    this.responseGeneration++;
    this.stopSpeaking();
    this.clearFinalBuffer();
    this.sentenceQueue = [];
    this.isProcessingQueue = false;

    if (isFinal && transcript.trim().length > 0) {
      if (this.onTranscript) this.onTranscript(transcript, true);
      this.stopListening();
      this.setMode('thinking');
    } else {
      if (this.onTranscript) this.onTranscript(transcript, false);
    }
  }

  private handleSilence(): void {
    if (this.mode !== 'listening') return;
    console.log('[Voice] Silence...');
    this.silenceOffered = true;
    if (this.onSilenceCb) {
      // Cortex's onGentlePrompt callback will handle speaking and resumeListening.
      this.onSilenceCb(this.silenceTimeout);
    } else {
      // Fallback when no Cortex is wired: speak a brief offer and resume.
      const offer = "Take your time. I'm here if you have any questions.";
      this.speak(offer).then(() => {
        if (this.mode !== 'dormant') this.resumeListening();
      });
    }
  }

  // ── TTS warm-up ──────────────────────────────────────────────────────────────

  private async warmUpTTS(): Promise<void> {
    console.log('[Voice] 🔥 Warming up TTS...');
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) synth.cancel();
      const warmUp = new SpeechSynthesisUtterance('test');
      warmUp.volume = 0.01;
      warmUp.rate = 2;
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      warmUp.onend = finish;
      warmUp.onerror = finish;
      setTimeout(finish, 1000);
      synth.speak(warmUp);
    });
  }

  // ── Silence timer ────────────────────────────────────────────────────────────

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    if (this.silenceOffered) return;
    if (this.mode === 'listening') {
      this.silenceTimer = setTimeout(() => this.handleSilence(), this.silenceTimeout);
    }
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
  }

  // ── Mode ─────────────────────────────────────────────────────────────────────

  private setMode(mode: VoiceMode): void {
    if (this.mode === mode) return;
    console.log(`[Voice] Mode: ${this.mode} → ${mode}`);
    this.mode = mode;
    if (this.onModeChange) this.onModeChange(mode);
  }

  getMode(): VoiceMode { return this.mode; }

  // ── Greeting/transition generators ──────────────────────────────────────────

  private generateGreeting(artworkTitle: string, visitorName?: string | null): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { generateGreeting } = require('@/lib/ai/greeting-generator');
      return generateGreeting(visitorName, artworkTitle);
    } catch {
      return visitorName
        ? `${visitorName}, let's take a look at this one.`
        : `Let's take a look at "${artworkTitle}".`;
    }
  }

  private generateTransition(previousTitle?: string, newTitle?: string): string {
    if (!previousTitle) return `Moving on to "${newTitle}".`;
    const transitions = [
      `From "${previousTitle}" to "${newTitle}" — quite a shift.`,
      `Alright, leaving "${previousTitle}" behind. "${newTitle}" is next.`,
      `Now here's "${newTitle}" — different energy entirely.`,
    ];
    return transitions[Math.floor(Math.random() * transitions.length)];
  }

  // ── Public API (event callbacks) ─────────────────────────────────────────────

  onModeChanged(callback: (mode: VoiceMode) => void): void { this.onModeChange = callback; }
  onTranscriptReceived(callback: (text: string, isFinal: boolean) => void): void { this.onTranscript = callback; }
  getTranscriptHandler(): ((text: string, isFinal: boolean) => void) | undefined { return this.onTranscript; }
  onSpeechEnded(callback: () => void): void { this.onSpeechEnd = callback; }
  onErrorOccurred(callback: (error: string) => void): void { this.onError = callback; }
  onNoisyEnvironmentDetected(callback: (suggestion: string) => void): void { this.onNoisyEnvironmentCb = callback; }
  onSilenceDetected(callback: (duration: number) => void): void { this.onSilenceCb = callback; }
  onEnrollmentComplete(_callback: () => void): void { /* deferred to V2 */ }

  setPipelineMode(mode: 'introduction' | 'tour'): void {
    this.pipelineMode = mode;
    this.pipeline?.setMode(mode);
  }

  addEnrollmentSample(): void { /* deferred to V2 */ }

  getEnrollmentProgress(): { samples: number; ready: boolean } {
    return { samples: 0, ready: false };
  }

  getPipeline(): VoicePipeline | null { return this.pipeline; }

  destroy(): void {
    this.stopTour(); // only resets lock if this instance owns it
    if (this.pipeline) { void this.pipeline.destroy(); this.pipeline = null; }
    if (this.unlockEl) { this.unlockEl.pause(); this.unlockEl.src = ''; this.unlockEl = null; }
  }

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.AudioContext || (window as any).webkitAudioContext) && !!navigator.mediaDevices?.getUserMedia;
  }
}
