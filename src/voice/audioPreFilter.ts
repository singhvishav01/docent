/**
 * AudioPreFilter — Lightweight browser-native audio cleanup
 *
 * Runs entirely in the browser's C++ Web Audio engine.
 * Zero WASM, zero JavaScript processing, zero latency.
 *
 * Chain: mic → high-pass filter → compressor → gain → output stream
 */

export class AudioPreFilter {
  private audioContext: AudioContext;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highPassFilter: BiquadFilterNode;
  private compressor: DynamicsCompressorNode;
  private gainNode: GainNode;
  private destinationNode: MediaStreamAudioDestinationNode;

  constructor() {
    // 16kHz is all Deepgram needs — lower sample rate = smaller payloads
    this.audioContext = new AudioContext({ sampleRate: 16000 });

    // High-pass at 85Hz — removes HVAC hum, footsteps, handling noise, room rumble
    this.highPassFilter = this.audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 85;
    this.highPassFilter.Q.value = 0.7; // gentle rolloff

    // Compressor — evens out volume so whispers and normal speech are comparable
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -40;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.1;

    // Gain — slight boost to compensate for compression loss
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.5;

    // Output — a new MediaStream to send to Deepgram
    this.destinationNode = this.audioContext.createMediaStreamDestination();

    // Chain
    this.highPassFilter
      .connect(this.compressor)
      .connect(this.gainNode)
      .connect(this.destinationNode);
  }

  /**
   * Connect a raw microphone stream through the filter chain.
   * Returns the cleaned MediaStream ready for Deepgram.
   *
   * Must be async: AudioContext can be 'suspended' when created after
   * an `await` call (even within a user-gesture chain). We resume it
   * here so the graph actually processes audio before recording starts.
   */
  async connect(micStream: MediaStream): Promise<MediaStream> {
    if (this.audioContext.state !== 'running') {
      await this.audioContext.resume();
    }
    this.sourceNode = this.audioContext.createMediaStreamSource(micStream);
    this.sourceNode.connect(this.highPassFilter);
    return this.destinationNode.stream;
  }

  /**
   * Reduce gain while docent is speaking to minimise echo on the mic.
   * Browser's built-in AEC (from getUserMedia) handles most of it — this is backup.
   *
   * When isSpeaking goes false (TTS ended), also resume the AudioContext in case
   * the browser suspended it during SpeechSynthesis warm-up or HTMLAudioElement
   * playback — a suspended context produces silence, starving the MediaRecorder.
   */
  setDocentSpeaking(isSpeaking: boolean): void {
    if (!isSpeaking && this.audioContext.state !== 'running') {
      console.log('[AudioPreFilter] AudioContext suspended — resuming after TTS');
      this.audioContext.resume().catch(() => { /* ignore */ });
    }
    this.gainNode.gain.setTargetAtTime(
      isSpeaking ? 0.6 : 1.5,
      this.audioContext.currentTime,
      0.1
    );
  }

  async destroy(): Promise<void> {
    this.sourceNode?.disconnect();
    try { await this.audioContext.close(); } catch { /* ignore */ }
  }
}
