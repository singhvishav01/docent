/**
 * POST /api/acquaintance/turn
 *
 * Handles a single voice intro exchange.
 * Runs two parallel OpenAI calls:
 *   1. Extraction  — pulls structured profile fields from the visitor's message
 *   2. Conversation — generates the docent's next spoken reply
 *
 * Returns: { nextMessage, updatedProfile, isComplete, tapScreen }
 *   tapScreen: null | 'interests' | 'vibe'
 *   When tapScreen is set, the client should pause voice and show the tap UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { VisitorProfile, mergeProfilePatch, applyHeuristics } from '@/lib/acquaintance/profile';
import { DOCENT_VOICE_PERSONA } from '@/lib/ai/docent-persona';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, baseURL: 'https://api.openai.com/v1' });

// Extraction prompt — produces a JSON patch of profile fields from speech transcript
const EXTRACTION_SYSTEM = `You are a silent profile extractor. Given a visitor's spoken message in a museum onboarding conversation, extract any information that can be inferred.

Transcripts may contain filler words (um, uh, like, you know) — ignore these.
Transcripts may have minor speech-to-text errors — use context to infer intent.

Return ONLY valid JSON (omit fields you cannot infer — do NOT guess):
{
  "identity": {
    "name": string | null,
    "age_range": string | null,
    "visit_group": "solo" | "with_partner" | "with_friends" | "with_kids" | "group" | null
  },
  "communication": {
    "formality": number (0-1),
    "humor_tolerance": number (0-1),
    "jargon_tolerance": number (0-1),
    "preferred_response_length": "short" | "medium" | "long"
  },
  "knowledge": {
    "art_history": number (0-1),
    "science": number (0-1),
    "history": number (0-1),
    "architecture": number (0-1),
    "music": number (0-1),
    "literature": number (0-1),
    "pop_culture": number (0-1),
    "technology": number (0-1)
  },
  "engagement": {
    "depth_preference": "surface" | "medium" | "deep",
    "pace": "quick" | "medium" | "slow",
    "learning_style": "visual" | "narrative" | "analytical" | "mixed" | null,
    "curiosity_level": number (0-1)
  },
  "personality": {
    "interests": string[],
    "analogy_domains": string[],
    "visit_intent": "casual" | "educational" | "tourist" | "enthusiast" | null,
    "openness_to_new": number (0-1),
    "museum_experience": "low" | "medium" | "high" | null
  }
}

Rules:
- Casual language = lower formality score. Enthusiastic language = higher engagement.
- Partial info is fine. "I guess I like history stuff" → history: 0.5, not 0.8.
- Interests and analogy_domains should be single domain words: ["cooking", "gaming", "film"].`;

type TapScreen = 'interests' | 'vibe' | null;

// Which tap screen to show after this turn (based on turn count)
// Turn 4 → show interests tap (after 3 real Q&A turns)
// Turn 6 → show vibe tap (after interests Q&A turn)
function getTapScreen(nextTurnCount: number): TapScreen {
  if (nextTurnCount === 4) return 'interests';
  if (nextTurnCount === 6) return 'vibe';
  return null;
}

function buildIntroConversationPrompt(
  docentName: string | null,
  visitorName: string | null,
  turnCount: number,
  tapScreen: TapScreen,
  isLastTurn: boolean
): string {
  const nameLine = docentName
    ? `Your name is ${docentName}.`
    : 'You are DOCENT, an AI museum guide.';

  const visitorLine = visitorName
    ? `The visitor's name is ${visitorName}.`
    : "You don't yet know the visitor's name.";

  let turnGuidance: string;

  if (isLastTurn) {
    turnGuidance = `This is the final intro turn. You now know the visitor's interests and communication style. Give a warm, energetic 1-2 sentence handoff that gets them excited to start — something like "Perfect. I've got a good read on you — let's go." Do NOT say "Hello" or "Welcome". Do not use the visitor's name here. Be punchy.`;
  } else if (tapScreen === 'interests') {
    turnGuidance = `You're about to show the visitor a tap screen where they'll select their interests. Say something short and natural that bridges into it — e.g. "Alright, one quick thing — I want to know what you're actually into so I can make this relevant. Tap whatever fits on the screen." Keep it under 2 sentences. Casual, not formal.`;
  } else if (tapScreen === 'vibe') {
    turnGuidance = `The visitor just answered a question about their interests. Acknowledge what they said briefly, then say you have one last quick thing — how they want to be talked to. Bridge into the vibe tap screen. Under 2 sentences. Casual.`;
  } else if (turnCount === 4) {
    turnGuidance = `The visitor just selected their interests from a tap screen. Ask ONE specific, curious follow-up question about one of the interests they picked — make it feel personal, not generic. Example: if they picked cooking, ask what they like to cook. 1 sentence only.`;
  } else if (turnCount === 0) {
    turnGuidance = `This is the FIRST spoken exchange. You are speaking out loud to the visitor. Greet them warmly but NOT with "Hello" or "Welcome" — start with something that sets the tone immediately. Then ask ONE casual question to get to know them — what brings them in, what kind of thing they're into, or what they're hoping for today. Sound like a person, not an automated system. Under 3 sentences.`;
  } else {
    turnGuidance = `Ask ONE natural follow-up question based on what they just said. Sound genuinely curious. Keep it to 1-2 sentences. Don't interrogate — this should feel like small talk with someone interesting.`;
  }

  return `${DOCENT_VOICE_PERSONA}

${nameLine}
${visitorLine}

You are in the INTRODUCTION phase — a brief voice conversation to get to know the visitor. Your output will be spoken aloud via text-to-speech.

SPOKEN OUTPUT RULES:
- No bullet points, no lists, no markdown, no parenthetical asides.
- Short sentences. Contractions. Natural rhythm.
- Maximum 2-3 sentences total.
- Do not mention art or artworks yet.

${turnGuidance}`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      userMessage,
      conversationHistory = [],
      profile,
      docentName = null,
      visitorName = null,
    }: {
      userMessage: string;
      conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
      profile: VisitorProfile;
      docentName: string | null;
      visitorName: string | null;
    } = await req.json();

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
    }

    const turnCount = profile.session.turn_count;
    const nextTurnCount = turnCount + 1;

    // Turn 7 = handoff (final)
    const isLastTurn = nextTurnCount >= 7;
    const tapScreen = isLastTurn ? null : getTapScreen(nextTurnCount);

    const conversationPrompt = buildIntroConversationPrompt(
      docentName, visitorName, turnCount, tapScreen, isLastTurn
    );

    const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // Parallel: extraction + conversation
    const [extractionResult, conversationResult] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM },
          { role: 'user', content: userMessage },
        ],
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 120,
        temperature: 0.85,
        messages: [
          { role: 'system', content: conversationPrompt },
          ...conversationMessages,
        ],
      }),
    ]);

    const nextMessage = conversationResult.choices[0]?.message?.content?.trim() ?? '';

    // Merge extraction patch into profile
    let updatedProfile = applyHeuristics(profile, userMessage);
    try {
      const rawPatch = extractionResult.choices[0]?.message?.content ?? '{}';
      const patch = JSON.parse(rawPatch) as Partial<VisitorProfile>;
      updatedProfile = mergeProfilePatch(updatedProfile, patch);
    } catch {
      // Extraction parse error — proceed with heuristic-only update
    }

    updatedProfile = {
      ...updatedProfile,
      session: { ...updatedProfile.session, turn_count: nextTurnCount },
    };

    const isComplete = isLastTurn;
    if (isComplete) {
      updatedProfile = { ...updatedProfile, intro_complete: true };
    }

    return NextResponse.json({ nextMessage, updatedProfile, isComplete, tapScreen });
  } catch (error) {
    console.error('[acquaintance/turn] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
