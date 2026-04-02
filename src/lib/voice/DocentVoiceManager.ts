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

  // Voice isolation pipeline (Deepgram-backed)
  private pipeline: VoicePipeline | null = null;
  private pipelineMode: 'introduction' | 'tour' = 'tour';

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

    if (this.mode === 'speaking' && transcript.trim().length > 2) {
      console.log('[Voice] 🛑 INTERRUPTION!');
      this.handleInterruption(transcript, isFinal);
      return;
    }

    if (transcript.trim().length > 0) {
      this.silenceOffered = false;
    }

    this.resetSilenceTimer();

    if (this.onTranscript) {
      this.onTranscript(transcript, isFinal);
    }

    if (isFinal && transcript.trim().length > 0 && this.mode === 'listening') {
      this.handleUserSpeech(transcript);
    }
  }

  // ── Tour lifecycle ───────────────────────────────────────────────────────────

  async startTour(artworkId: string, artworkTitle: string, visitorName?: string | null): Promise<void> {
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
  }

  async onArtworkChange(newArtworkId: string, newArtworkTitle: string): Promise<void> {
    this.stopSpeaking();

    const previousArtwork = this.currentArtwork;
    this.currentArtwork = { id: newArtworkId, title: newArtworkTitle };

    this.setMode('speaking');
    this.pipeline?.setMode('tour');

    const transition = this.generateTransition(previousArtwork?.title, newArtworkTitle);
    await this.speak(transition);

    this.startListening();
  }

  stopTour(): void {
    this.stopListening();
    this.stopSpeaking();
    this.sentenceQueue = [];
    this.isProcessingQueue = false;
    this.queueFinalized = false;
    this.spokenSentenceCount = 0;
    this.clearSilenceTimer();
    this.setMode('dormant');
    this.currentArtwork = null;
    if (this.pipeline) { this.pipeline.destroy(); this.pipeline = null; }
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
      const audio = new Audio(url);
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
    if (this.onSilenceCb) this.onSilenceCb(this.silenceTimeout);
    this.silenceOffered = true;

    const offers = [
      "Feel free to ask me anything when you're ready.",
      "Take your time. I'm here if you have any questions.",
      "Let me know if you'd like to hear more.",
      "I'm here to help whenever you're ready.",
    ];
    const offer = offers[Math.floor(Math.random() * offers.length)];
    this.speak(offer).then(() => {
      if (this.mode !== 'dormant') this.resumeListening();
    });
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
      const { generateGreeting } = require('@/lib/greeting-generator');
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
    this.stopTour();
    if (this.pipeline) { this.pipeline.destroy(); this.pipeline = null; }
  }

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.AudioContext || (window as any).webkitAudioContext) && !!navigator.mediaDevices?.getUserMedia;
  }
}
