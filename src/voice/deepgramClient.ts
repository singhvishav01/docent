/**
 * DeepgramClient — real browser WebSocket to Deepgram streaming STT
 *
 * Uses a native WebSocket (not the Deepgram Node SDK) so an actual WS
 * connection appears in DevTools Network → WS tab.
 *
 * Auth: temporary key fetched from /api/deepgram-token (master key stays server-side).
 */

export class DeepgramClient {
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunkCount = 0;

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

  async start(filteredStream: MediaStream): Promise<void> {
    // 1. Fetch temporary key from backend proxy
    const res = await fetch('/api/deepgram-token', { method: 'POST' });
    if (!res.ok) throw new Error('[Deepgram] Failed to get session key');
    const { key } = await res.json();

    // 2. Detect mimeType before opening the socket
    this._mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';

    // 3. Build Deepgram streaming URL with query params
    //    Do NOT include encoding/sample_rate/channels — auto-detected from the
    //    webm/opus container. Passing 'linear16' while sending webm produces no
    //    transcripts because Deepgram misreads the container bytes as raw PCM.
    const params = new URLSearchParams({
      model: 'nova-2',
      language: 'en',
      smart_format: 'true',
      endpointing: String(this.endpointing),
      utterance_end_ms: '2000',
      interim_results: 'true',
      vad_events: 'true',
    });
    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    // 4. Open a real browser WebSocket — visible in DevTools Network → WS tab
    //    Deepgram accepts the API key as a sub-protocol: ['token', '<key>']
    this.socket = new WebSocket(url, ['token', key]);
    this.socket.binaryType = 'arraybuffer';

    // 5. Wait for the socket to open before starting MediaRecorder
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('[Deepgram] WebSocket open timeout')),
        8000
      );
      this.socket!.onopen = () => {
        clearTimeout(timeout);
        console.log('[Deepgram] WebSocket OPEN — real connection established');
        resolve();
      };
      this.socket!.onerror = (ev) => {
        clearTimeout(timeout);
        console.error('[Deepgram] WebSocket error on open:', ev);
        reject(new Error('[Deepgram] WebSocket connection failed'));
      };
    });

    // 6. Wire message / close / error handlers
    this.socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);

        // Only log messages that carry actual information (suppress empty Results heartbeats)
        const transcript = msg.type === 'Results'
          ? (msg.channel?.alternatives?.[0]?.transcript ?? '')
          : null;
        if (msg.type !== 'Results' || transcript?.trim()) {
          console.log('[Deepgram] RAW message:', JSON.stringify(msg).substring(0, 200));
        }

        if (msg.type === 'Results') {
          if (transcript?.trim()) {
            console.log(`[Deepgram] Transcript: "${transcript}" (final=${msg.is_final})`);
            this.onTranscript?.(transcript, msg.is_final ?? false);
          }
        } else if (msg.type === 'SpeechStarted') {
          console.log('[Deepgram] SpeechStarted');
          this.onSpeechStarted?.();
        } else if (msg.type === 'UtteranceEnd') {
          this.onUtteranceEnd?.();
        } else if (msg.type === 'Metadata') {
          console.log('[Deepgram] Metadata received (connection confirmed)');
        }
      } catch {
        /* binary frame or non-JSON — ignore */
      }
    };

    this.socket.onclose = (ev) => {
      console.log(`[Deepgram] WebSocket CLOSED — code: ${ev.code}, reason: ${ev.reason}`);
      this.socket = null;
    };

    this.socket.onerror = (ev) => {
      console.error('[Deepgram] WebSocket runtime error:', ev);
      this.onError?.(new Error('Deepgram WebSocket error'));
    };

    // 7. Start MediaRecorder and pipe audio to the socket
    this.streamAudio(filteredStream);
  }

  private streamAudio(stream: MediaStream): void {
    this.mediaRecorder = this._mimeType
      ? new MediaRecorder(stream, { mimeType: this._mimeType })
      : new MediaRecorder(stream);

    this.chunkCount = 0;
    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.chunkCount++;
          if (this.chunkCount <= 5 || this.chunkCount % 50 === 0) {
            console.log(`[Deepgram] Sending audio chunk #${this.chunkCount}, size=${e.data.size}b`);
          }
          this.socket.send(e.data);
        } else if (this.socket) {
          console.warn(`[Deepgram] Cannot send chunk — socket readyState=${this.socket.readyState}`);
        }
      }
    };

    console.log(`[Deepgram] Starting MediaRecorder (mimeType=${this.mediaRecorder.mimeType})`);
    this.mediaRecorder.start(100);
  }

  pause(): void {
    console.log('[Deepgram] pause() called — recorder state:', this.mediaRecorder?.state);
    if (this.mediaRecorder?.state === 'recording') this.mediaRecorder.pause();
  }

  resume(): void {
    console.log('[Deepgram] resume() called — recorder state:', this.mediaRecorder?.state);
    if (this.mediaRecorder?.state === 'paused') this.mediaRecorder.resume();
  }

  setEndpointing(ms: number): void {
    this.endpointing = ms;
    // Endpointing can only be set at connection time; stored for next reconnect
  }

  async stop(): Promise<void> {
    try { this.mediaRecorder?.stop(); } catch { /* ignore */ }
    if (this.socket?.readyState === WebSocket.OPEN) {
      try { this.socket.send(JSON.stringify({ type: 'CloseStream' })); } catch { /* ignore */ }
    }
    try { this.socket?.close(); } catch { /* ignore */ }
    this.mediaRecorder = null;
    this.socket = null;
  }
}
