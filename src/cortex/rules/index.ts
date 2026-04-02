import { CortexContext, Signal, CortexAction } from '../types';

export interface Rule {
  matches(context: CortexContext, signal: Signal): boolean;
  getAction(context: CortexContext, signal: Signal): CortexAction;
}

function action(type: CortexAction['type'], params: Record<string, any> = {}): CortexAction {
  return { type, params, timestamp: Date.now() };
}

// ── Rule: Visitor spoke → respond ─────────────────────────────────────────────
export class VisitorSpokeRule implements Rule {
  matches(_ctx: CortexContext, signal: Signal) {
    return signal.type === 'visitor_spoke';
  }

  getAction(ctx: CortexContext, signal: Signal): CortexAction {
    const transcript: string = signal.value?.transcript ?? '';
    const wordCount: number = signal.value?.wordCount ?? transcript.split(' ').length;
    const strategy = this.pickStrategy(ctx, transcript, wordCount);
    const maxTokens = this.getMaxTokens(ctx);
    return action('respond', { transcript, strategy, maxTokens, artwork: ctx.location.currentArtwork });
  }

  private pickStrategy(ctx: CortexContext, transcript: string, wordCount: number): string {
    if (wordCount <= 2 && !/\?/.test(transcript)) return 'brief_continue';
    if (/\?/.test(transcript) || /\b(why|how|what|when|who|where|tell me)\b/i.test(transcript)) return 'answer_question';
    if (/\b(reminds me|I think|I feel|looks like|my|I love|I hate)\b/i.test(transcript)) return 'engage_personal';
    return 'natural_continue';
  }

  private getMaxTokens(ctx: CortexContext): number {
    if (ctx.energy.sessionFatigue === 'fatigued') return 100;
    if (ctx.visitor.depthPreference === 'surface') return 120;
    if (ctx.visitor.depthPreference === 'deep') return 250;
    return 150;
  }
}

// ── Rule: Visitor interrupted → stop and process ──────────────────────────────
export class VisitorInterruptedRule implements Rule {
  matches(_ctx: CortexContext, signal: Signal) {
    return signal.type === 'visitor_interrupted';
  }

  getAction(_ctx: CortexContext, signal: Signal): CortexAction {
    return action('interrupt_response', {
      transcript: signal.value?.transcript ?? '',
      interruptionPoint: signal.value?.interruptionPoint ?? 0,
    });
  }
}

// ── Rule: New artwork detected → transition ────────────────────────────────────
export class ArtworkTransitionRule implements Rule {
  matches(_ctx: CortexContext, signal: Signal) {
    return signal.type === 'artwork_detected';
  }

  getAction(ctx: CortexContext, signal: Signal): CortexAction {
    const newArtwork = signal.value as { id: string; title: string; artist?: string; period?: string; movement?: string };

    // Speed-walking: 3+ artwork scans in 30 seconds → wait
    const recentTransitions = ctx.recentSignals.filter(s => s.type === 'artwork_detected').length;
    if (recentTransitions >= 3) {
      return action('wait', { reason: 'speed_walking' });
    }

    // Return visit
    const isReturn = ctx.location.artworksViewed.includes(newArtwork.id);
    if (isReturn) {
      return action('return_visit', {
        artwork: newArtwork,
        previousTopics: ctx.momentum.topicsLanded,
      });
    }

    // Find connection between artworks
    const from = ctx.location.currentArtwork;
    let connection: { type: string; detail: string } | null = null;
    if (from) {
      if (from.artist === newArtwork.artist) connection = { type: 'same_artist', detail: from.artist! };
      else if (from.period === newArtwork.period && from.period) connection = { type: 'same_period', detail: from.period };
      else if (from.movement === newArtwork.movement && from.movement) connection = { type: 'same_movement', detail: from.movement };
      else if (from.movement && newArtwork.movement && from.movement !== newArtwork.movement) {
        connection = { type: 'contrast', detail: `${from.movement} vs ${newArtwork.movement}` };
      }
    }

    return action('transition', {
      from: ctx.location.currentArtwork,
      to: newArtwork,
      connection,
      conversationDepth: ctx.momentum.conversationDepth,
    });
  }
}

// ── Rule: Silence too long → gentle prompt ────────────────────────────────────
export class AwkwardSilenceRule implements Rule {
  matches(_ctx: CortexContext, signal: Signal) {
    return signal.type === 'visitor_silent' && signal.value?.duration > 15000;
  }

  getAction(_ctx: CortexContext, signal: Signal): CortexAction {
    const duration: number = signal.value?.duration ?? 0;
    if (duration < 30000) return action('gentle_prompt', { style: 'observational' });
    if (duration < 60000) return action('gentle_prompt', { style: 'check_in' });
    return action('wait', { reason: 'likely_departed' });
  }
}

// ── Rule: Visitor waiting for intro ───────────────────────────────────────────
export class VisitorWaitingRule implements Rule {
  matches(ctx: CortexContext, signal: Signal) {
    return ctx.energy.isVisitorWaiting
      && !!ctx.location.currentArtwork
      && ctx.momentum.conversationDepth === 'intro'
      && signal.type !== 'visitor_spoke'; // don't double-trigger with VisitorSpokeRule
  }

  getAction(ctx: CortexContext, _signal: Signal): CortexAction {
    return action('introduce_artwork', { artwork: ctx.location.currentArtwork });
  }
}

// ── Rule: Engagement dropping → pivot ─────────────────────────────────────────
export class EngagementDroppingRule implements Rule {
  matches(ctx: CortexContext, signal: Signal) {
    return signal.type === 'engagement_down'
      && ctx.momentum.engagementTrend === 'declining'
      && ctx.momentum.recentEngagement < 0.3;
  }

  getAction(ctx: CortexContext, _signal: Signal): CortexAction {
    const approach = ctx.visitor.interests.length > 0 ? 'analogy' : 'story';
    return action('pivot_approach', { from: 'informational', to: approach });
  }
}

// ── Rule: Session fatigue → offer a break ────────────────────────────────────
export class SessionFatigueRule implements Rule {
  private suggested = false;

  matches(ctx: CortexContext, _signal: Signal) {
    return ctx.energy.sessionFatigue === 'fatigued' && !this.suggested;
  }

  getAction(_ctx: CortexContext, _signal: Signal): CortexAction {
    this.suggested = true;
    return action('fatigue_check', {});
  }
}

// ── Rule: Interesting connection to visitor's interests ───────────────────────
export class ConnectionOpportunityRule implements Rule {
  private mentionedConnections = new Set<string>();

  matches(ctx: CortexContext, signal: Signal) {
    // Only fires proactively (not in response to speech) when engagement is good
    if (signal.type === 'visitor_spoke') return false;
    if (!ctx.location.currentArtwork) return false;
    if (ctx.momentum.recentEngagement < 0.4) return false;
    return this.hasUnmentionedConnection(ctx);
  }

  getAction(ctx: CortexContext, _signal: Signal): CortexAction {
    const interest = this.getRelevantInterest(ctx);
    const key = `${ctx.location.currentArtwork!.id}:${interest}`;
    this.mentionedConnections.add(key);
    return action('share_connection', {
      artwork: ctx.location.currentArtwork,
      interest,
    });
  }

  private hasUnmentionedConnection(ctx: CortexContext): boolean {
    const artwork = ctx.location.currentArtwork!;
    for (const interest of ctx.visitor.interests) {
      const key = `${artwork.id}:${interest}`;
      if (artwork.connections?.[interest] && !this.mentionedConnections.has(key)) {
        return true;
      }
    }
    return false;
  }

  private getRelevantInterest(ctx: CortexContext): string {
    const artwork = ctx.location.currentArtwork!;
    return ctx.visitor.interests.find(i => artwork.connections?.[i]) ?? ctx.visitor.interests[0] ?? 'general';
  }
}

// ── Rule: Default idle ────────────────────────────────────────────────────────
export class IdleRule implements Rule {
  matches() { return true; }
  getAction() { return { type: 'wait' as const, params: {}, timestamp: Date.now() }; }
}
