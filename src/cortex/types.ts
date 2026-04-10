import { VisitorProfile } from '@/lib/acquaintance/profile';

export type SignalType =
  | 'visitor_spoke'
  | 'visitor_silent'
  | 'visitor_interrupted'
  | 'visitor_laughed'
  | 'ambient_noise_high'
  | 'unknown_speaker'
  | 'artwork_detected'
  | 'artwork_lost'
  | 'visitor_returned'
  | 'speed_walking'
  | 'engagement_up'
  | 'engagement_down'
  | 'topic_landed'
  | 'topic_flopped'
  | 'knowledge_revealed'
  | 'confusion_detected'
  | 'profile_updated'
  | 'onboarding_complete'
  | 'session_started'
  | 'session_idle'
  | 'session_duration'
  | 'session_paused'
  | 'session_resumed';

export interface Signal {
  type: SignalType;
  value: any;
  source: string;
  timestamp: number;
}

export type ActionType =
  | 'respond'
  | 'transition'
  | 'return_visit'
  | 'interrupt_response'
  | 'gentle_prompt'
  | 'introduce_artwork'
  | 'pivot_approach'
  | 'fatigue_check'
  | 'share_connection'
  | 'wait';

export interface CortexAction {
  type: ActionType;
  params: Record<string, any>;
  timestamp: number;
}

export type SessionFatigue = 'fresh' | 'steady' | 'tiring' | 'fatigued';
export type ConversationDepth = 'intro' | 'surface' | 'engaged' | 'deep';

export interface ArtworkInfo {
  id: string;
  title: string;
  artist?: string;
  year?: number;
  medium?: string;
  period?: string;
  movement?: string;
  connections?: Record<string, string>;
}

export interface CortexContext {
  visitor: {
    name: string | null;
    formality: number;
    humorStyle: string | null;
    interests: string[];
    analogyDomains: string[];
    knowledgeLevels: Record<string, number>;
    depthPreference: 'surface' | 'medium' | 'deep';
    pace: 'quick' | 'medium' | 'slow';
  };
  lastAction: {
    type: string;
    content: string;
    timestamp: number;
    visitorResponse: string | null;
  };
  location: {
    currentArtwork: ArtworkInfo | null;
    previousArtwork: ArtworkInfo | null;
    artworksViewed: string[];
    artworkCount: number;
  };
  momentum: {
    engagementTrend: 'increasing' | 'neutral' | 'declining';
    recentEngagement: number;
    topicsLanded: string[];
    topicsFlopped: string[];
    conversationDepth: ConversationDepth;
  };
  energy: {
    silenceDuration: number;
    isVisitorWaiting: boolean;
    sessionDuration: number;
    sessionFatigue: SessionFatigue;
    ambientNoise: number;
    recentLaughter: boolean;
    isPaused: boolean;
    pauseDuration: number; // ms since last pause started (0 if not paused)
  };
  recentSignals: Signal[];
}

export interface ActionLogEntry {
  signal: Signal;
  context: Partial<CortexContext>;
  action: CortexAction;
  timestamp: number;
}

// Callbacks registered by PersistentChatInterface so Cortex can trigger existing code paths
export interface CortexCallbacks {
  onRespond: (transcript: string, strategy: string, maxTokens: number) => void;
  onIntroduceArtwork: (artwork: ArtworkInfo) => void;
  onGentlePrompt: (style: 'observational' | 'check_in', artwork: ArtworkInfo | null) => void;
  onPivot: (approach: 'analogy' | 'story', interests: string[]) => void;
  onFatigueCheck: () => void;
  onShareConnection: (artwork: ArtworkInfo, interest: string) => void;
  onReturnVisit: (artwork: ArtworkInfo, previousTopics: string[]) => void;
  onInterrupt: (transcript: string) => void;
}
