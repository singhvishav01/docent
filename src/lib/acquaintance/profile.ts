/**
 * Acquaintance Engine — Visitor Profile
 * Defines the profile schema, defaults, and pure utility functions.
 * All numeric scales are 0.0–1.0. Never set them absolutely — apply small deltas.
 */

export interface VisitorProfile {
  visitor_id: string;
  created_at: string;
  last_updated: string;
  intro_complete: boolean;

  identity: {
    name: string | null;
    age_range: string | null;
    language_preference: string;
    visit_group: string | null;  // 'solo' | 'with_partner' | 'with_friends' | 'with_kids' | 'group'
  };

  communication: {
    formality: number;              // 0 = very casual, 1 = very formal
    humor_style: string | null;     // 'dry' | 'warm' | 'none'
    humor_tolerance: number;        // 0 = no humor, 1 = loves it
    sarcasm_appreciation: boolean | null;
    jargon_tolerance: number;       // 0 = plain english only, 1 = art terminology fine
    emoji_usage: boolean;
    preferred_response_length: 'short' | 'medium' | 'long';
    swear_tolerance: boolean;
  };

  knowledge: {
    art_history: number;
    science: number;
    history: number;
    architecture: number;
    music: number;
    literature: number;
    pop_culture: number;
    technology: number;
  };

  engagement: {
    depth_preference: 'surface' | 'medium' | 'deep';
    pace: 'quick' | 'medium' | 'slow';
    attention_span: 'short' | 'medium' | 'long';
    learning_style: string | null;  // 'visual' | 'narrative' | 'analytical' | 'mixed'
    engagement_style: 'highlights' | 'full_tour' | 'self_directed';
    curiosity_level: number;        // 0-1
  };

  personality: {
    interests: string[];
    analogy_domains: string[];      // derived from interests — used for analogies
    visit_intent: string | null;    // 'casual' | 'educational' | 'tourist' | 'enthusiast'
    openness_to_new: number;        // 0-1
    social_context: string | null;
    museum_experience: 'low' | 'medium' | 'high' | null;
  };

  session: {
    pieces_viewed: string[];
    topics_engaged: string[];
    topics_disengaged: string[];
    questions_asked: string[];
    avg_response_length: number;
    avg_time_per_piece: number;
    engagement_trend: 'increasing' | 'neutral' | 'declining';
    mood_indicators: string[];
    turn_count: number;
    message_count: number;          // total chat messages exchanged
  };
}

/** Zero-state profile for brand-new visitors. All fields at neutral defaults. */
export const DEFAULT_PROFILE: VisitorProfile = {
  visitor_id: '',
  created_at: '',
  last_updated: '',
  intro_complete: false,

  identity: {
    name: null,
    age_range: null,
    language_preference: 'en',
    visit_group: null,
  },

  communication: {
    formality: 0.5,
    humor_style: null,
    humor_tolerance: 0.5,
    sarcasm_appreciation: null,
    jargon_tolerance: 0.3,
    emoji_usage: false,
    preferred_response_length: 'medium',
    swear_tolerance: false,
  },

  knowledge: {
    art_history: 0.2,
    science: 0.5,
    history: 0.5,
    architecture: 0.3,
    music: 0.4,
    literature: 0.4,
    pop_culture: 0.6,
    technology: 0.5,
  },

  engagement: {
    depth_preference: 'medium',
    pace: 'medium',
    attention_span: 'medium',
    learning_style: null,
    engagement_style: 'highlights',
    curiosity_level: 0.5,
  },

  personality: {
    interests: [],
    analogy_domains: [],
    visit_intent: null,
    openness_to_new: 0.6,
    social_context: null,
    museum_experience: null,
  },

  session: {
    pieces_viewed: [],
    topics_engaged: [],
    topics_disengaged: [],
    questions_asked: [],
    avg_response_length: 0,
    avg_time_per_piece: 0,
    engagement_trend: 'neutral',
    mood_indicators: [],
    turn_count: 0,
    message_count: 0,
  },
};

/**
 * Create a fresh profile with a generated ID. Call this when a visitor begins their intro.
 */
export function createProfile(visitorName?: string | null): VisitorProfile {
  const now = new Date().toISOString();
  return {
    ...DEFAULT_PROFILE,
    visitor_id: generateId(),
    created_at: now,
    last_updated: now,
    identity: {
      ...DEFAULT_PROFILE.identity,
      name: visitorName || null,
    },
  };
}

/**
 * Merge a partial patch into the current profile. Clamps all numeric fields to [0, 1].
 * Never replaces arrays wholesale — extends them.
 */
export function mergeProfilePatch(
  current: VisitorProfile,
  patch: Partial<VisitorProfile>
): VisitorProfile {
  const merged = deepMerge(current, patch) as VisitorProfile;
  merged.last_updated = new Date().toISOString();

  // Clamp all numeric fields
  merged.communication.formality = clamp(merged.communication.formality);
  merged.communication.humor_tolerance = clamp(merged.communication.humor_tolerance);
  merged.communication.jargon_tolerance = clamp(merged.communication.jargon_tolerance);
  merged.engagement.curiosity_level = clamp(merged.engagement.curiosity_level);
  merged.personality.openness_to_new = clamp(merged.personality.openness_to_new);

  for (const key of Object.keys(merged.knowledge) as Array<keyof VisitorProfile['knowledge']>) {
    merged.knowledge[key] = clamp(merged.knowledge[key]);
  }

  return merged;
}

/**
 * Apply lightweight heuristics after a single exchange. Pure — returns new profile.
 * Deltas are intentionally small (max ±0.05) to prevent single-message distortion.
 */
export function applyHeuristics(
  profile: VisitorProfile,
  userMessage: string,
  responseTimeMs?: number
): VisitorProfile {
  const words = userMessage.trim().split(/\s+/);
  const wordCount = words.length;

  let patch: Partial<VisitorProfile> = {
    session: { ...profile.session },
  };

  const session = { ...profile.session };
  const engagement = { ...profile.engagement };
  const communication = { ...profile.communication };

  // Response length → engagement trend
  if (wordCount <= 3) {
    session.engagement_trend = shiftTrend(session.engagement_trend, 'down');
  } else if (wordCount >= 20) {
    session.engagement_trend = shiftTrend(session.engagement_trend, 'up');
    engagement.curiosity_level = clamp(profile.engagement.curiosity_level + 0.03);
  }

  // Follow-up language → curiosity
  if (/\b(why|how|tell me more|what about|really|interesting|fascinating|go on)\b/i.test(userMessage)) {
    engagement.curiosity_level = clamp(profile.engagement.curiosity_level + 0.05);
  }

  // Confusion signals → lower jargon tolerance
  if (/\b(what\?|huh|confused|don't get|lost me|english please|what does that mean)\b/i.test(userMessage)) {
    communication.jargon_tolerance = clamp(profile.communication.jargon_tolerance - 0.1);
  }

  // Humor response → humor tolerance
  if (/\b(lol|lmao|haha|hahaha|😂|🤣|that's funny|hilarious)\b/i.test(userMessage)) {
    communication.humor_tolerance = clamp(profile.communication.humor_tolerance + 0.05);
  }

  // Skip / move on signals → topics_disengaged trend
  if (/\b(skip|move on|next|boring|don't care|whatever)\b/i.test(userMessage)) {
    session.engagement_trend = shiftTrend(session.engagement_trend, 'down');
  }

  // Update avg response length (running mean)
  const prevAvg = session.avg_response_length;
  const prevCount = session.message_count;
  session.avg_response_length = prevCount === 0
    ? wordCount
    : Math.round((prevAvg * prevCount + wordCount) / (prevCount + 1));
  session.message_count = prevCount + 1;

  return {
    ...profile,
    engagement: { ...profile.engagement, ...engagement },
    communication: { ...profile.communication, ...communication },
    session: { ...profile.session, ...session },
  };
}

// ── Private helpers ──────────────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function shiftTrend(
  current: 'increasing' | 'neutral' | 'declining',
  direction: 'up' | 'down'
): 'increasing' | 'neutral' | 'declining' {
  if (direction === 'up') {
    return current === 'declining' ? 'neutral' : 'increasing';
  }
  return current === 'increasing' ? 'neutral' : 'declining';
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function deepMerge(base: any, patch: any): any {
  if (!patch || typeof patch !== 'object') return patch ?? base;
  const result = { ...base };
  for (const key of Object.keys(patch)) {
    if (Array.isArray(patch[key])) {
      // Merge arrays: extend with unique new items
      const existing: any[] = Array.isArray(base[key]) ? base[key] : [];
      const incoming: any[] = patch[key];
      result[key] = [...new Set([...existing, ...incoming])];
    } else if (typeof patch[key] === 'object' && patch[key] !== null) {
      result[key] = deepMerge(base[key] ?? {}, patch[key]);
    } else if (patch[key] !== null && patch[key] !== undefined) {
      result[key] = patch[key];
    }
  }
  return result;
}
