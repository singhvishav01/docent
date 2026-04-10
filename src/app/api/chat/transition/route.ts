// src/app/api/chat/transition/route.ts
// Generates a natural, AI-written bridging message when the visitor moves to a new artwork.
// Uses gpt-4o at high temperature for creative, thematic connections.
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: 'https://api.openai.com/v1' });

export async function POST(req: NextRequest) {
  let body: any = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    previousTitle,
    previousArtist,
    newTitle,
    newArtist,
    newYear,
    lastMessages,
    spokenSoFar,
    visitorProfile,
    isReturnVisit,
    barelyStarted,
    midQuestion,
    midSpeech,
  } = body;

  if (!newTitle) {
    return NextResponse.json({ error: 'newTitle is required' }, { status: 400 });
  }

  const fallback = isReturnVisit
    ? `Back to "${newTitle}"${newArtist ? ` by ${newArtist}` : ''}. Let me share something new this time.`
    : `Moving on to "${newTitle}"${newArtist ? ` by ${newArtist}` : ''}${newYear ? `, ${newYear}` : ''}.`;

  try {
    // Compact snippet of recent conversation
    let conversationSnippet = '';
    if (Array.isArray(lastMessages) && lastMessages.length > 0) {
      conversationSnippet = lastMessages
        .slice(-3)
        .map((m: { role: string; content: string }) =>
          `${m.role === 'user' ? 'Visitor' : 'Docent'}: ${m.content.substring(0, 120)}`
        )
        .join('\n');
    }

    // Keep spokenSoFar tight — last ~300 chars is enough context
    const spokenContext =
      typeof spokenSoFar === 'string' && spokenSoFar.length > 0
        ? spokenSoFar.slice(-300)
        : '';

    // Build tone guidance from visitor profile
    let toneGuidance = '';
    if (visitorProfile) {
      const comm = visitorProfile.communication;
      const eng = visitorProfile.engagement;
      if (comm) {
        const formality =
          comm.formality > 0.6 ? 'formal' : comm.formality < 0.3 ? 'casual' : 'conversational';
        const humor =
          comm.humor_tolerance > 0.5 ? 'light humor welcome' : 'keep it straightforward';
        toneGuidance = `Tone: ${formality}, ${humor}.`;
      }
      if (eng) {
        const pace = eng.pace || 'medium';
        toneGuidance += ` Pace: ${pace}.`;
      }
    }

    const systemPrompt = `You are DOCENT — an expert museum guide walking alongside a visitor.
You speak warmly, intelligently, and conversationally — never robotic or stiff.
Your personality blends genuine curiosity, dry wit, and deep art knowledge.
${toneGuidance ? '\n' + toneGuidance : ''}

Your task: write a seamless spoken transition as the visitor moves from one artwork to the next.

RULES:
- Write 3-5 sentences total, under ${midSpeech ? '110' : '90'} words.
- Do NOT start with "I" or "Hello" or "Welcome".
- Write as if speaking aloud — short sentences, natural rhythm, contractions.
- STRUCTURE: First 1-2 sentences bridge away from the previous artwork. Final 1-2 sentences open the new artwork with a specific intriguing detail, visual observation, or open question — pull the visitor in, don't just name the piece.
- Try to find a thematic, visual, or historical connection between the two artworks.
- If no obvious connection exists, use the physical act of moving to the next piece as the bridge.${
  barelyStarted
    ? '\n- The visitor barely engaged with the previous artwork. Skip the wrap-up entirely — just pivot fresh to the new artwork with an intriguing hook.'
    : ''
}${
  isReturnVisit
    ? '\n- The visitor has RETURNED to this artwork. Acknowledge the return briefly ("Back to this one?" / "This one pulled you back.") then offer a fresh angle they have not heard yet.'
    : ''
}${
  midQuestion
    ? '\n- The visitor was mid-question when they moved. Briefly close out the answer in one short sentence before bridging to the new artwork.'
    : ''
}${
  midSpeech
    ? '\n- You were mid-explanation when the visitor moved on. In your FIRST sentence, land the thought you were building toward — give it a clean conclusion. Then bridge to the new artwork. Do not just abandon what you were saying.'
    : ''
}`;

    const userPrompt = previousTitle
      ? `Previous artwork: "${previousTitle}"${previousArtist ? ` by ${previousArtist}` : ''}.
${spokenContext ? `What I've said so far:\n"${spokenContext}"\n` : ''}${conversationSnippet ? `Recent conversation:\n${conversationSnippet}\n` : ''}
New artwork: "${newTitle}"${newArtist ? ` by ${newArtist}` : ''}${newYear ? ` (${newYear})` : ''}.

Write the transition.`
      : `The visitor has arrived at "${newTitle}"${newArtist ? ` by ${newArtist}` : ''}${newYear ? ` (${newYear})` : ''}. Introduce it warmly in 1-2 sentences.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.9,
    });

    const transitionText =
      completion.choices[0]?.message?.content?.trim() ?? fallback;

    return NextResponse.json({ transition: transitionText });
  } catch (error) {
    console.error('[transition API] Error:', error);
    return NextResponse.json({ transition: fallback });
  }
}
