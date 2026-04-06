/**
 * DeepgramClient — WebSocket streaming STT client (Deepgram SDK v5)
 *
 * Sends filtered audio to Deepgram and emits transcript events.
 * The API key is fetched from our backend proxy — never hardcoded client-side.
 */

import { DeepgramClient as DGClient } from '@deepgram/sdk';

export class DeepgramClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private socket: any = null;
  private mediaRecorder: MediaRecorder | null = null;

  // Callbacks
  onTranscript: ((transcript: string, isFinal: boolean) => void) | null = null;
  onSpeechStarted: (() => void) | null = null;
  onUtteranceEnd: (() => void) | null = null;
  onError: ((error: Error) => void) | null = null;

  private endpointing: number;
  private _mimeType = '';

  constructor(endpointing = 1200) {
    this.endpointing = endpointing;
  }

  /**
   * Fetch a short-lived Deepgram key from our backend proxy,
   * open a WebSocket connection, and start streaming.
   */
  async start(filteredStream: MediaStream): Promise<void> {
    // Get temporary key from backend — never expose the master key client-side
    const res = await fetch('/api/deepgram-token', { method: 'POST' });
    if (!res.ok) throw new Error('[Deepgram] Failed to get session key');
    const { key } = await res.json();

    const dg = new DGClient({ apiKey: key });

    // Detect container format BEFORE opening the socket.
    // MediaRecorder never outputs raw PCM — it produces a container (webm/opus
    // on Chrome/Android, mp4/aac on Safari/iOS).
    // For container audio, do NOT pass encoding/sample_rate to Deepgram — it
    // reads those from the container headers automatically. Passing encoding:
    // 'linear16' while sending webm means Deepgram tries to decode webm bytes
    // as raw PCM → no transcripts. Passing encoding: 'opus' means it expects
    // raw Opus frames, not a webm container → also breaks.
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';

    this.socket = await dg.listen.v1.connect({
      model: 'nova-2',
      Authorization: key,
      language: 'en',
      smart_format: 'true',
      endpointing: this.endpointing,
      utterance_end_ms: 2000,
      interim_results: 'true',
      // No encoding/sample_rate — Deepgram auto-detects from the audio container
      channels: 1,
      vad_events: 'true',
    });
    this._mimeType = mimeType;

    this.socket.on('open', () => {
      console.log('[Deepgram] Connected');
      this.streamAudio(filteredStream);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.on('message', (msg: any) => {
      if (msg.type === 'Results') {
        const transcript = msg.channel?.alternatives?.[0]?.transcript ?? '';
        console.log(`[Deepgram] Results: "${transcript}" (final=${msg.is_final})`);
        if (!transcript.trim()) return;
        this.onTranscript?.(transcript, msg.is_final ?? false);
      } else if (msg.type === 'SpeechStarted') {
        console.log('[Deepgram] SpeechStarted');
        this.onSpeechStarted?.();
      } else if (msg.type === 'UtteranceEnd') {
        this.onUtteranceEnd?.();
      } else if (msg.type === 'Metadata') {
        console.log('[Deepgram] Metadata received (connection confirmed)');
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.on('error', (err: any) => {
      console.error('[Deepgram] Error:', err);
      this.onError?.(err instanceof Error ? err : new Error('Deepgram error'));
    });

    this.socket.on('close', () => {
      console.log('[Deepgram] Closed');
    });
  }

  private streamAudio(stream: MediaStream): void {
    // Use the mimeType detected during socket init so MediaRecorder output
    // matches what we told Deepgram to expect.
    this.mediaRecorder = this._mimeType
      ? new MediaRecorder(stream, { mimeType: this._mimeType })
      : new MediaRecorder(stream);

    let chunkCount = 0;
    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0 && this.socket) {
        chunkCount++;
        if (chunkCount <= 5 || chunkCount % 50 === 0) {
          console.log(`[Deepgram] Sending audio chunk #${chunkCount}, size=${e.data.size}b`);
        }
        this.socket.sendMedia(e.data);
      }
    };

    console.log(`[Deepgram] Starting MediaRecorder (mimeType=${this.mediaRecorder.mimeType})`);
    // 100ms chunks — low latency without overwhelming the connection
    this.mediaRecorder.start(100);
  }

  pause(): void {
    if (this.mediaRecorder?.state === 'recording') this.mediaRecorder.pause();
  }

  resume(): void {
    if (this.mediaRecorder?.state === 'paused') this.mediaRecorder.resume();
  }

  setEndpointing(ms: number): void {
    this.endpointing = ms;
    // Endpointing can only be set at connection time; store for next reconnect
  }

  async stop(): Promise<void> {
    try { this.mediaRecorder?.stop(); } catch { /* ignore */ }
    try { this.socket?.close(); } catch { /* ignore */ }
    this.mediaRecorder = null;
    this.socket = null;
  }
}
