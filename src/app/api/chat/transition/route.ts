// src/app/api/chat/transition/route.ts
// Generates a natural, AI-written bridging message when the visitor moves to a new artwork
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  let body: any = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { previousTitle, previousArtist, newTitle, newArtist, newYear, lastMessages } = body;

  if (!newTitle) {
    return NextResponse.json({ error: 'newTitle is required' }, { status: 400 });
  }

  // Fallback string used if AI fails
  const fallback = `Moving on to "${newTitle}"${newArtist ? ` by ${newArtist}` : ''}${newYear ? `, ${newYear}` : ''}.`;

  try {
    // Build a compact snippet of the last few messages so the AI can reference
    // what was being discussed without a large token cost.
    let conversationSnippet = '';
    if (Array.isArray(lastMessages) && lastMessages.length > 0) {
      conversationSnippet = lastMessages
        .slice(-3)
        .map((m: { role: string; content: string }) =>
          `${m.role === 'user' ? 'Visitor' : 'Docent'}: ${m.content.substring(0, 120)}`
        )
        .join('\n');
    }

    const systemPrompt = `You are an expert museum docent guiding a visitor through a gallery.
You speak in a warm, intelligent, and conversational tone — never robotic or stiff.
You will receive the artwork the visitor was just looking at, the recent conversation, and the new artwork they have moved to.
Write a single cohesive 2-3 sentence transition that:
1. Briefly and gracefully wraps up the previous topic (only if there was active discussion worth closing)
2. Naturally notices the visitor has moved on and introduces the new artwork
Keep it under 65 words. Do NOT start with "I" or "Hello". Write as if walking alongside the visitor.`;

    const userPrompt = previousTitle
      ? `The visitor was viewing "${previousTitle}" by ${previousArtist}.
${conversationSnippet ? `Recent conversation:\n${conversationSnippet}\n\n` : ''}They have now moved to "${newTitle}"${newArtist ? ` by ${newArtist}` : ''}${newYear ? ` (${newYear})` : ''}. Write the transition.`
      : `The visitor has arrived at "${newTitle}"${newArtist ? ` by ${newArtist}` : ''}${newYear ? ` (${newYear})` : ''}. Introduce it warmly in 1-2 sentences.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 120,
      temperature: 0.8,
    });

    const transitionText = completion.choices[0]?.message?.content?.trim() ?? fallback;

    return NextResponse.json({ transition: transitionText });
  } catch (error) {
    console.error('[transition API] Error:', error);
    return NextResponse.json({ transition: fallback });
  }
}
