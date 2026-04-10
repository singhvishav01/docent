/**
 * VoicePipeline — simplified audio pipeline
 *
 * mic → AudioPreFilter (browser C++ engine) → Deepgram WebSocket → transcript
 *
 * Replaces: ScriptProcessor + RNNoise WASM + ONNX ECAPA-TDNN + custom VAD + Whisper
 */

import { AudioPreFilter } from './audioPreFilter';
import { DeepgramClient } from './deepgramClient';

export class VoicePipeline {
  mode: 'introduction' | 'tour' = 'tour';

  private preFilter: AudioPreFilter | null = null;
  private deepgram: DeepgramClient | null = null;
  private micStream: MediaStream | null = null;
  private initialized = false;

  // Callbacks wired by DocentVoiceManager
  onTranscript: ((transcript: string, isFinal: boolean) => void) | null = null;
  onSpeechStarted: (() => void) | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 16000,
      },
      video: false,
    });

    this.preFilter = new AudioPreFilter();
    const filteredStream = await this.preFilter.connect(this.micStream);

    // 2500ms — museum visitors often pause mid-sentence while looking at artwork.
    // 1200ms was too short and split single utterances into multiple finals,
    // causing premature responses to fragments like "I just" before the rest arrived.
    const endpointing = this.mode === 'introduction' ? 3000 : 2500;
    this.deepgram = new DeepgramClient(endpointing);

    this.deepgram.onTranscript = (transcript, isFinal) => {
      this.onTranscript?.(transcript, isFinal);
    };

    this.deepgram.onSpeechStarted = () => {
      this.onSpeechStarted?.();
    };

    this.deepgram.onError = (err) => {
      console.error('[Pipeline] Deepgram error:', err);
    };

    await this.deepgram.start(filteredStream);

    this.initialized = true;
    console.log('[Pipeline] mic → pre-filter → Deepgram — ready');
  }

  setMode(mode: 'introduction' | 'tour'): void {
    this.mode = mode;
    const ms = mode === 'introduction' ? 2000 : 1200;
    this.deepgram?.setEndpointing(ms);
  }

  /** Called when docent starts speaking — reduces mic gain to minimise echo */
  onDocentSpeaking(): void {
    this.preFilter?.setDocentSpeaking(true);
  }

  /** Called when docent stops speaking */
  onDocentSilent(): void {
    this.preFilter?.setDocentSpeaking(false);
  }

  async destroy(): Promise<void> {
    try { await this.deepgram?.stop(); } catch { /* ignore */ }
    try { await this.preFilter?.destroy(); } catch { /* ignore */ }
    this.micStream?.getTracks().forEach(t => t.stop());
    this.micStream = null;
    this.preFilter = null;
    this.deepgram = null;
    this.initialized = false;
    console.log('[Pipeline] Destroyed');
  }
}
