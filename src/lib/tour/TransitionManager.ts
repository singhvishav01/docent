// src/lib/tour/TransitionManager.ts
// State-machine-driven artwork transition coordinator.
// Handles dwell timing, cooldowns, spokenSoFar tracking, and return-visit detection.
// Client-side only — no 'use server'.

export type TransitionState =
  | 'IDLE'         // Normal operation
  | 'DWELL_WAIT'   // Waiting for dwell timer before committing
  | 'WRAPPING_UP'  // Finishing current sentence, preparing wrap-up
  | 'BRIDGING'     // Generating + speaking the bridge to the new artwork
  | 'COMPLETE';    // Transition done

export interface TransitionRequest {
  previousArtworkId: string;
  newArtworkId: string;
  newTitle: string;
  newArtist?: string;
  newYear?: number;
}

export interface TransitionContext {
  spokenSoFar: string;
  sentenceCount: number;
  isReturnVisit: boolean;
  midQuestion: boolean;
  barelyStarted: boolean;
}

export interface TransitionManagerConfig {
  dwellMs?: number;
  cooldownMs?: number;
}

type TransitionCallback = (
  request: TransitionRequest,
  context: TransitionContext
) => Promise<void>;

export class TransitionManager {
  private state: TransitionState = 'IDLE';
  private dwellMs: number;
  private cooldownMs: number;

  private dwellTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTransitionTime = 0;

  private pendingRequest: TransitionRequest | null = null;

  private visitedArtworks: Set<string> = new Set();
  private currentArtworkId: string | null = null;
  private spokenSoFar = '';
  private sentenceCount = 0;

  private onTransitionReady: TransitionCallback | null = null;
  private abortController: AbortController | null = null;

  constructor(config: TransitionManagerConfig = {}) {
    this.dwellMs = config.dwellMs ?? 2000;
    this.cooldownMs = config.cooldownMs ?? 3000;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getState(): TransitionState {
    return this.state;
  }

  onReady(cb: TransitionCallback): void {
    this.onTransitionReady = cb;
  }

  setInitialArtwork(artworkId: string): void {
    this.currentArtworkId = artworkId;
    this.visitedArtworks.add(artworkId);
    this.spokenSoFar = '';
    this.sentenceCount = 0;
  }

  requestTransition(request: TransitionRequest): void {
    if (request.newArtworkId === this.currentArtworkId) return;

    // Same destination already pending — ignore
    if (
      this.pendingRequest &&
      this.pendingRequest.newArtworkId === request.newArtworkId
    ) {
      return;
    }

    // Mid-transition to a different artwork — abort and restart
    if (this.state !== 'IDLE') {
      this.abortTransition();
    }

    // Enforce minimum dwell and cooldown
    const elapsed = Date.now() - this.lastTransitionTime;
    const remainingCooldown = Math.max(0, this.cooldownMs - elapsed);
    const totalWait = Math.max(this.dwellMs, remainingCooldown);

    this.pendingRequest = request;
    this.state = 'DWELL_WAIT';

    console.log(
      `[TransitionManager] Dwell wait: ${totalWait}ms for "${request.newTitle}"`
    );

    this.dwellTimer = setTimeout(() => {
      this.dwellTimer = null;
      this.commitTransition();
    }, totalWait);
  }

  abortTransition(): void {
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.pendingRequest = null;
    this.state = 'IDLE';
    console.log('[TransitionManager] Transition aborted');
  }

  isTransitioning(): boolean {
    return this.state !== 'IDLE' && this.state !== 'COMPLETE';
  }

  // ---------------------------------------------------------------------------
  // SpokenSoFar tracking (updated in real time as sentences stream in)
  // ---------------------------------------------------------------------------

  appendSpoken(text: string): void {
    this.spokenSoFar += (this.spokenSoFar ? ' ' : '') + text;
  }

  incrementSentenceCount(): void {
    this.sentenceCount++;
  }

  getSentenceCount(): number {
    return this.sentenceCount;
  }

  getSpokenSoFar(): string {
    return this.spokenSoFar;
  }

  hasVisited(artworkId: string): boolean {
    return this.visitedArtworks.has(artworkId);
  }

  getCurrentArtworkId(): string | null {
    return this.currentArtworkId;
  }

  destroy(): void {
    this.abortTransition();
    this.visitedArtworks.clear();
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private resetTrackingForNewArtwork(artworkId: string): void {
    this.visitedArtworks.add(artworkId);
    this.currentArtworkId = artworkId;
    this.spokenSoFar = '';
    this.sentenceCount = 0;
  }

  private async commitTransition(): Promise<void> {
    if (!this.pendingRequest || !this.onTransitionReady) {
      this.state = 'IDLE';
      return;
    }

    const request = this.pendingRequest;
    this.pendingRequest = null;

    // < 2 sentences spoken = barely started; skip wrap-up, just pivot
    const barelyStarted = this.sentenceCount < 2;

    const context: TransitionContext = {
      spokenSoFar: this.spokenSoFar,
      sentenceCount: this.sentenceCount,
      isReturnVisit: this.visitedArtworks.has(request.newArtworkId),
      midQuestion: false, // Caller (PersistentChatInterface) overrides this
      barelyStarted,
    };

    this.state = barelyStarted ? 'BRIDGING' : 'WRAPPING_UP';
    console.log(
      `[TransitionManager] Committing transition: "${request.previousArtworkId}" -> "${request.newArtworkId}" ` +
      `(sentences=${context.sentenceCount}, return=${context.isReturnVisit}, barelyStarted=${barelyStarted})`
    );

    this.abortController = new AbortController();

    try {
      await this.onTransitionReady(request, context);

      if (this.abortController?.signal.aborted) {
        this.state = 'IDLE';
        return;
      }

      this.state = 'COMPLETE';
      this.lastTransitionTime = Date.now();
      this.resetTrackingForNewArtwork(request.newArtworkId);
      this.state = 'IDLE';
    } catch (error) {
      console.error('[TransitionManager] Transition failed:', error);
      this.state = 'IDLE';
    } finally {
      this.abortController = null;
    }
  }
}
