/**
 * Acquaintance Engine — Prompt Layer
 * Converts a VisitorProfile into a compact prose block for the system prompt.
 * Target: ~100 tokens. Returns empty string for near-default profiles.
 */

import { VisitorProfile } from './profile';

const DEFAULT_THRESHOLDS = {
  formality: { low: 0.35, high: 0.65 },
  humor_tolerance: { low: 0.35, high: 0.65 },
  jargon_tolerance: { low: 0.35, high: 0.65 },
  curiosity_level: { low: 0.35, high: 0.65 },
  knowledge: { low: 0.35, high: 0.65 },
};

function isDiverged(value: number, low = 0.35, high = 0.65): boolean {
  return value < low || value > high;
}

/**
 * Build a compact natural-language visitor profile block for injection into the system prompt.
 * Returns empty string if profile is essentially at defaults (no meaningful info gathered).
 */
export function buildAcquaintanceLayer(profile: VisitorProfile): string {
  if (!profile.intro_complete && profile.session.turn_count < 2) return '';

  const lines: string[] = [];

  // Identity
  const nameLine = profile.identity.name ? `Visitor's name is ${profile.identity.name}.` : null;
  const groupMap: Record<string, string> = {
    solo: 'visiting alone',
    with_partner: 'visiting with a partner',
    with_friends: 'visiting with friends',
    with_kids: 'visiting with kids',
    group: 'part of a group',
  };
  const groupLine = profile.identity.visit_group ? groupMap[profile.identity.visit_group] ?? null : null;

  if (nameLine) lines.push(nameLine);
  if (groupLine) {
    const intentMap: Record<string, string> = {
      casual: 'casually',
      educational: 'to learn',
      tourist: 'as a tourist',
      enthusiast: 'as an art enthusiast',
    };
    const intentPart = profile.personality.visit_intent ? ` ${intentMap[profile.personality.visit_intent] ?? ''}` : '';
    lines.push(`They are ${groupLine}${intentPart}.`);
  }

  // Communication style
  const commParts: string[] = [];
  if (isDiverged(profile.communication.formality)) {
    commParts.push(profile.communication.formality < 0.35 ? 'casual tone' : 'formal tone');
  }
  if (isDiverged(profile.communication.humor_tolerance)) {
    commParts.push(profile.communication.humor_tolerance < 0.35 ? 'no humor' : 'appreciates humor');
  }
  if (isDiverged(profile.communication.jargon_tolerance)) {
    commParts.push(profile.communication.jargon_tolerance < 0.35 ? 'plain language only' : 'comfortable with art terminology');
  }
  if (profile.communication.preferred_response_length !== 'medium') {
    commParts.push(`prefers ${profile.communication.preferred_response_length} responses`);
  }
  if (commParts.length > 0) {
    lines.push(`Communication: ${commParts.join(', ')}.`);
  }

  // Knowledge levels (only flag outliers)
  const highKnowledge: string[] = [];
  const lowKnowledge: string[] = [];
  for (const [domain, value] of Object.entries(profile.knowledge)) {
    if (value >= 0.65) highKnowledge.push(domain.replace('_', ' '));
    else if (value <= 0.35) lowKnowledge.push(domain.replace('_', ' '));
  }
  if (highKnowledge.length > 0) lines.push(`Strong background in: ${highKnowledge.join(', ')}.`);
  if (lowKnowledge.length > 0) lines.push(`Limited knowledge of: ${lowKnowledge.join(', ')}.`);

  // Engagement
  const engParts: string[] = [];
  if (profile.engagement.depth_preference !== 'medium') {
    engParts.push(`${profile.engagement.depth_preference} depth`);
  }
  if (profile.engagement.pace !== 'medium') {
    engParts.push(`${profile.engagement.pace} pace`);
  }
  if (profile.engagement.learning_style) {
    engParts.push(`${profile.engagement.learning_style} learner`);
  }
  if (isDiverged(profile.engagement.curiosity_level)) {
    engParts.push(profile.engagement.curiosity_level < 0.35 ? 'low curiosity' : 'highly curious');
  }
  if (engParts.length > 0) {
    lines.push(`Engagement: ${engParts.join(', ')}.`);
  }

  // Interests and analogy domains
  if (profile.personality.interests.length > 0) {
    lines.push(`Interests: ${profile.personality.interests.slice(0, 4).join(', ')}.`);
  }
  if (profile.personality.analogy_domains.length > 0) {
    lines.push(`Use analogies from: ${profile.personality.analogy_domains.slice(0, 3).join(', ')}.`);
  }

  // Museum experience
  if (profile.personality.museum_experience && profile.personality.museum_experience !== 'medium') {
    const expMap = { low: 'first-time museum-goer', high: 'seasoned museum visitor' };
    lines.push(expMap[profile.personality.museum_experience as 'low' | 'high'] ?? '');
  }

  // Session signals
  if (profile.session.engagement_trend === 'declining') {
    lines.push('Engagement is declining — keep responses punchy and surprising.');
  }
  if (profile.session.topics_disengaged.length > 0) {
    lines.push(`Avoid: ${profile.session.topics_disengaged.slice(0, 2).join(', ')}.`);
  }

  if (lines.length === 0) return '';

  return `\n--- VISITOR PROFILE ---\n${lines.join(' ')}\n--- END PROFILE ---`;
}
