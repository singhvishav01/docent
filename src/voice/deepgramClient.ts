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

    this.socket = await dg.listen.v1.connect({
      model: 'nova-2',
      Authorization: key,
      language: 'en',
      smart_format: 'true',
      endpointing: this.endpointing,
      utterance_end_ms: 2000,
      interim_results: 'true',
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
      vad_events: 'true',
    });

    this.socket.on('open', () => {
      console.log('[Deepgram] Connected');
      this.streamAudio(filteredStream);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.on('message', (msg: any) => {
      if (msg.type === 'Results') {
        const transcript = msg.channel?.alternatives?.[0]?.transcript ?? '';
        if (!transcript.trim()) return;
        this.onTranscript?.(transcript, msg.is_final ?? false);
      } else if (msg.type === 'SpeechStarted') {
        this.onSpeechStarted?.();
      } else if (msg.type === 'UtteranceEnd') {
        this.onUtteranceEnd?.();
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
    // Prefer webm/opus — widest browser support for streaming
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : '';

    this.mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0 && this.socket) {
        this.socket.sendMedia(e.data);
      }
    };

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
