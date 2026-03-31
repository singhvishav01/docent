/**
 * POST /api/acquaintance/update
 *
 * Deep profile update — called every 5th assistant message during the main tour.
 * Analyses the last N conversation turns and returns a merged profile patch.
 *
 * Body: { profile: VisitorProfile, recentHistory: Array<{role, content}> }
 * Returns: { updatedProfile: VisitorProfile }
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { VisitorProfile, mergeProfilePatch } from '@/lib/acquaintance/profile';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, baseURL: 'https://api.openai.com/v1' });

const DEEP_EXTRACTION_SYSTEM = `You are a silent visitor profile analyst. You will receive a block of recent museum-tour conversation turns. Extract any evidence about the visitor's profile.

Return ONLY valid JSON matching this schema (omit any field you have no evidence for):
{
  "identity": {
    "visit_group": "solo" | "with_partner" | "with_friends" | "with_kids" | "group" | null
  },
  "communication": {
    "formality": number (0.0-1.0, 0=casual, 1=formal),
    "humor_tolerance": number (0.0-1.0),
    "jargon_tolerance": number (0.0-1.0),
    "preferred_response_length": "short" | "medium" | "long"
  },
  "knowledge": {
    "art_history": number (0.0-1.0),
    "science": number (0.0-1.0),
    "history": number (0.0-1.0),
    "architecture": number (0.0-1.0),
    "music": number (0.0-1.0),
    "literature": number (0.0-1.0),
    "pop_culture": number (0.0-1.0),
    "technology": number (0.0-1.0)
  },
  "engagement": {
    "depth_preference": "surface" | "medium" | "deep",
    "pace": "quick" | "medium" | "slow",
    "curiosity_level": number (0.0-1.0),
    "learning_style": "visual" | "narrative" | "analytical" | "mixed" | null
  },
  "personality": {
    "interests": string[],
    "analogy_domains": string[],
    "openness_to_new": number (0.0-1.0)
  },
  "session": {
    "topics_engaged": string[],
    "topics_disengaged": string[],
    "mood_indicators": string[],
    "engagement_trend": "increasing" | "neutral" | "declining"
  }
}

Evidence guidelines:
- Short/one-word visitor replies → declining engagement, short preferred_response_length
- Many follow-up questions → high curiosity_level (0.7+), deep depth_preference
- Laughter / humor signals → high humor_tolerance (0.7+)
- Technical vocabulary used correctly → raise relevant knowledge domain
- "skip", "boring", "move on" → topics_disengaged, declining engagement_trend
- Never guess. Only include fields where the conversation provides clear evidence.`;

export async function POST(req: NextRequest) {
  try {
    const {
      profile,
      recentHistory,
    }: {
      profile: VisitorProfile;
      recentHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    } = await req.json();

    if (!profile || !recentHistory?.length) {
      return NextResponse.json({ error: 'profile and recentHistory required' }, { status: 400 });
    }

    // Build conversation block for extraction
    const conversationBlock = recentHistory
      .map(m => `${m.role === 'user' ? 'Visitor' : 'Docent'}: ${m.content}`)
      .join('\n');

    const result = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: DEEP_EXTRACTION_SYSTEM },
        { role: 'user', content: conversationBlock },
      ],
    });

    let updatedProfile = profile;
    try {
      const rawPatch = result.choices[0]?.message?.content ?? '{}';
      const patch = JSON.parse(rawPatch) as Partial<VisitorProfile>;
      updatedProfile = mergeProfilePatch(profile, patch);
    } catch {
      // Parse error — return profile unchanged
    }

    return NextResponse.json({ updatedProfile });
  } catch (error) {
    console.error('[acquaintance/update] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
