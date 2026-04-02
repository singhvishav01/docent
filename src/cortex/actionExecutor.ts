import { CortexAction, CortexContext, CortexCallbacks, ArtworkInfo } from './types';

export class ActionExecutor {
  private callbacks: Partial<CortexCallbacks> = {};

  registerCallbacks(callbacks: Partial<CortexCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async execute(action: CortexAction, context: CortexContext): Promise<void> {
    console.log(`[Cortex] Executing: ${action.type}`, action.params);

    switch (action.type) {
      case 'respond':
        this.callbacks.onRespond?.(
          action.params.transcript,
          action.params.strategy,
          action.params.maxTokens
        );
        break;

      case 'introduce_artwork':
        if (action.params.artwork) {
          this.callbacks.onIntroduceArtwork?.(action.params.artwork);
        }
        break;

      case 'interrupt_response':
        this.callbacks.onInterrupt?.(action.params.transcript);
        break;

      case 'gentle_prompt':
        this.callbacks.onGentlePrompt?.(
          action.params.style,
          context.location.currentArtwork
        );
        break;

      case 'pivot_approach':
        this.callbacks.onPivot?.(
          action.params.to,
          context.visitor.interests
        );
        break;

      case 'fatigue_check':
        this.callbacks.onFatigueCheck?.();
        break;

      case 'share_connection':
        if (action.params.artwork) {
          this.callbacks.onShareConnection?.(
            action.params.artwork,
            action.params.interest
          );
        }
        break;

      case 'return_visit':
        if (action.params.artwork) {
          this.callbacks.onReturnVisit?.(
            action.params.artwork,
            action.params.previousTopics ?? []
          );
        }
        break;

      case 'transition':
        // TransitionManager handles this via its own requestTransition() call
        // The Cortex just acknowledges — the transition was already requested
        break;

      case 'wait':
        // Nothing to do
        break;

      default:
        console.warn(`[Cortex] Unknown action: ${(action as any).type}`);
    }
  }
}
