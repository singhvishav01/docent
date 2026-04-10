import { VisitorProfile } from '@/lib/acquaintance/profile';
import { SignalBus } from './signalBus';
import { ContextBuilder } from './contextBuilder';
import { DecisionEngine } from './decisionEngine';
import { ActionExecutor } from './actionExecutor';
import {
  Signal,
  SignalType,
  CortexAction,
  CortexCallbacks,
  ArtworkInfo,
  ActionLogEntry,
  CortexContext,
} from './types';

export class Cortex {
  readonly signalBus: SignalBus;
  private contextBuilder: ContextBuilder;
  private decisionEngine: DecisionEngine;
  private actionExecutor: ActionExecutor;
  private actionLog: ActionLogEntry[] = [];
  private isProcessing = false;
  private unsubscribe?: () => void;

  constructor(profile: VisitorProfile) {
    this.signalBus = new SignalBus();
    this.contextBuilder = new ContextBuilder(profile, this.signalBus);
    this.decisionEngine = new DecisionEngine();
    this.actionExecutor = new ActionExecutor();

    this.unsubscribe = this.signalBus.onSignal((signal) => this.onSignal(signal));
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Register action callbacks from PersistentChatInterface */
  registerCallbacks(callbacks: Partial<CortexCallbacks>): void {
    this.actionExecutor.registerCallbacks(callbacks);
  }

  /** Emit a signal directly (for systems that don't have a Cortex reference) */
  emit(type: SignalType, value: any, source: string): void {
    this.signalBus.emit(type, value, source);
  }

  /** Update the visitor profile (call when profile changes) */
  updateProfile(profile: VisitorProfile): void {
    this.contextBuilder.updateProfile(profile);
  }

  /** Set the current artwork being viewed */
  setCurrentArtwork(artwork: ArtworkInfo | null): void {
    this.contextBuilder.setCurrentArtwork(artwork);
  }

  /** Notify Cortex when the session pauses or resumes due to inactivity */
  setPaused(value: boolean): void {
    this.contextBuilder.setPaused(value);
    if (!value) {
      // Emit resumed signal with the actual tracked pause duration
      const pauseDuration = this.contextBuilder.getLastPauseDuration();
      this.signalBus.emit('session_resumed', { pauseDuration }, 'cortex_internal');
    }
  }

  /** Get the action log (for debugging / future ML) */
  getActionLog(): ActionLogEntry[] {
    return [...this.actionLog];
  }

  /** Clean up listeners */
  destroy(): void {
    this.unsubscribe?.();
  }

  // ── Core loop ───────────────────────────────────────────────────────────────

  private async onSignal(signal: Signal): Promise<void> {
    const isUrgent = this.isUrgentSignal(signal);

    if (this.isProcessing && !isUrgent) return;

    this.isProcessing = true;
    try {
      const context = this.contextBuilder.build();
      const action = this.decisionEngine.decide(context, signal);

      this.actionLog.push({
        signal,
        context: this.summarizeContext(context),
        action,
        timestamp: Date.now(),
      });

      // Trim log to last 200 entries
      if (this.actionLog.length > 200) this.actionLog.splice(0, this.actionLog.length - 200);

      await this.actionExecutor.execute(action, context);

      // Record what docent just did
      this.contextBuilder.recordAction(action.type, JSON.stringify(action.params).slice(0, 100));
      if (signal.type === 'visitor_spoke') {
        this.contextBuilder.recordVisitorResponse(signal.value?.transcript ?? '');
      }
    } catch (err) {
      console.error('[Cortex] Error processing signal:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private isUrgentSignal(signal: Signal): boolean {
    return ['visitor_interrupted', 'artwork_detected', 'visitor_spoke'].includes(signal.type);
  }

  private summarizeContext(context: CortexContext): Partial<CortexContext> {
    return {
      location: context.location,
      momentum: context.momentum,
      energy: {
        ...context.energy,
        silenceDuration: Math.round(context.energy.silenceDuration / 1000),
      },
    };
  }
}
