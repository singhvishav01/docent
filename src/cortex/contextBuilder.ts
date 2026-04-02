import { VisitorProfile } from '@/lib/acquaintance/profile';
import { SignalBus } from './signalBus';
import {
  ArtworkInfo, CortexContext, ConversationDepth, SessionFatigue, Signal
} from './types';

export class ContextBuilder {
  private profile: VisitorProfile;
  private signalBus: SignalBus;
  private sessionStartTime: number;
  private currentArtwork: ArtworkInfo | null = null;
  private previousArtwork: ArtworkInfo | null = null;
  private lastActionType = 'wait';
  private lastActionContent = '';
  private lastActionTime = 0;
  private lastVisitorResponse: string | null = null;
  private lastTransitionTime = 0;

  constructor(profile: VisitorProfile, signalBus: SignalBus) {
    this.profile = profile;
    this.signalBus = signalBus;
    this.sessionStartTime = Date.now();
  }

  updateProfile(profile: VisitorProfile): void {
    this.profile = profile;
  }

  setCurrentArtwork(artwork: ArtworkInfo | null): void {
    if (artwork?.id !== this.currentArtwork?.id) {
      this.previousArtwork = this.currentArtwork;
      this.lastTransitionTime = Date.now();
    }
    this.currentArtwork = artwork;
  }

  recordAction(type: string, content: string): void {
    this.lastActionType = type;
    this.lastActionContent = content;
    this.lastActionTime = Date.now();
  }

  recordVisitorResponse(text: string): void {
    this.lastVisitorResponse = text;
  }

  build(): CortexContext {
    const recentSignals = this.signalBus.getWindow(30);
    return {
      visitor: {
        name: this.profile.identity.name,
        formality: this.profile.communication.formality,
        humorStyle: this.profile.communication.humor_style,
        interests: this.profile.personality.interests,
        analogyDomains: this.profile.personality.analogy_domains,
        knowledgeLevels: this.profile.knowledge as unknown as Record<string, number>,
        depthPreference: this.profile.engagement.depth_preference,
        pace: this.profile.engagement.pace,
      },
      lastAction: {
        type: this.lastActionType,
        content: this.lastActionContent,
        timestamp: this.lastActionTime,
        visitorResponse: this.lastVisitorResponse,
      },
      location: {
        currentArtwork: this.currentArtwork,
        previousArtwork: this.previousArtwork,
        artworksViewed: this.profile.session.pieces_viewed,
        artworkCount: this.profile.session.pieces_viewed.length,
      },
      momentum: {
        engagementTrend: this.profile.session.engagement_trend,
        recentEngagement: this.calculateRecentEngagement(recentSignals),
        topicsLanded: this.profile.session.topics_engaged,
        topicsFlopped: this.profile.session.topics_disengaged,
        conversationDepth: this.getConversationDepth(),
      },
      energy: {
        silenceDuration: this.getCurrentSilence(recentSignals),
        isVisitorWaiting: this.isVisitorWaiting(recentSignals),
        sessionDuration: this.getSessionDuration(),
        sessionFatigue: this.estimateFatigue(),
        ambientNoise: this.getAmbientNoise(recentSignals),
        recentLaughter: this.hasRecentLaughter(recentSignals),
      },
      recentSignals,
    };
  }

  private calculateRecentEngagement(signals: Signal[]): number {
    const engagementSignals = signals.filter(s =>
      s.type === 'engagement_up' || s.type === 'engagement_down'
    );
    if (engagementSignals.length === 0) return 0.5;
    const last = engagementSignals[engagementSignals.length - 1];
    return last.value?.score ?? 0.5;
  }

  private getConversationDepth(): ConversationDepth {
    const afterTransition = this.signalBus.getAll()
      .filter(s => s.type === 'visitor_spoke' && s.timestamp > this.lastTransitionTime);
    const count = afterTransition.length;
    if (count === 0) return 'intro';
    if (count <= 2) return 'surface';
    if (count <= 5) return 'engaged';
    return 'deep';
  }

  private getCurrentSilence(signals: Signal[]): number {
    const lastSilent = this.signalBus.getRecent('visitor_silent', 1)[0];
    return lastSilent ? lastSilent.value?.duration ?? 0 : 0;
  }

  private isVisitorWaiting(signals: Signal[]): boolean {
    // Visitor is waiting if they've been at an artwork but docent hasn't spoken yet
    const recentSpoken = signals.filter(s => s.type === 'visitor_spoke').length;
    return !!(this.currentArtwork && recentSpoken === 0 && this.getConversationDepth() === 'intro');
  }

  private getSessionDuration(): number {
    return (Date.now() - this.sessionStartTime) / 60000; // minutes
  }

  private estimateFatigue(): SessionFatigue {
    const minutes = this.getSessionDuration();
    const trend = this.profile.session.engagement_trend;
    if (minutes < 20) return 'fresh';
    if (minutes < 40) return trend === 'declining' ? 'tiring' : 'steady';
    if (minutes < 60) return 'tiring';
    return 'fatigued';
  }

  private getAmbientNoise(signals: Signal[]): number {
    const noiseSignal = signals.filter(s => s.type === 'ambient_noise_high').slice(-1)[0];
    return noiseSignal?.value?.level ?? 0;
  }

  private hasRecentLaughter(signals: Signal[]): boolean {
    return signals.some(s => s.type === 'visitor_laughed');
  }
}
