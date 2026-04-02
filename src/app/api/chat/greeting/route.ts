// src/app/api/chat/greeting/route.ts
// Generates an AI-written greeting when a visitor arrives at an artwork
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getArtworkContext } from '../../../../lib/artwork-cache';
import { DOCENT_VOICE_PERSONA } from '../../../../lib/ai/docent-persona';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: 'https://api.openai.com/v1' });

export async function POST(req: NextRequest) {
  try {
    const { artworkId, museumId, visitorName, docentName } = await req.json();

    if (!artworkId || !museumId) {
      return NextResponse.json({ greeting: '' }, { status: 400 });
    }

    const cached = await getArtworkContext(artworkId, museumId);

    if (!cached) {
      return NextResponse.json({ greeting: '' }, { status: 404 });
    }

    const { artwork, curatorNotes } = cached;

    const artworkContext = `CURRENT ARTWORK
Title:  ${artwork.title}
Artist: ${artwork.artist}${artwork.year ? `\nYear:   ${artwork.year}` : ''}${artwork.medium ? `\nMedium: ${artwork.medium}` : ''}${artwork.description ? `\nNotes:  ${artwork.description}` : ''}
Museum: ${artwork.museum.name}`;

    const curatorContext = curatorNotes.length > 0
      ? `\nCURATOR NOTES:\n${curatorNotes.map(n => `[${n.type}] ${n.content}`).join('\n')}`
      : '';

    const visitorLine = visitorName
      ? `\nThe visitor's name is ${visitorName}. Use it once, naturally.`
      : '';

    const docentNameLine = docentName
      ? `\nIDENTITY: Your name is ${docentName}. If the visitor asks your name, confirm it naturally and warmly. Do not volunteer your name unless asked.`
      : '';

    const greetingInstruction = `This is the FIRST message the visitor will see. Do not repeat the persona rules back. Write a single, natural opening — 2 to 3 sentences maximum. You are standing with the visitor in front of this specific artwork right now. React to the artwork as if seeing it together for the first time. Use the visitor's name once if you have it. Do not say 'Hello' or 'Welcome'. Do not start with 'I'. Start with something that pulls them into the painting immediately.`;

    const systemPrompt = `${DOCENT_VOICE_PERSONA}\n\n${artworkContext}${curatorContext}${visitorLine}${docentNameLine}\n\n${greetingInstruction}`;

    const TIMEOUT_MS = 8000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Greeting timeout')), TIMEOUT_MS)
    );

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Greet me.' },
        ],
        max_tokens: 120,
        temperature: 0.85,
        stream: false,
      }),
      timeoutPromise,
    ]);

    const greeting = completion.choices[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({ greeting });
  } catch (error: any) {
    console.error('[greeting API] Error:', error.message);
    // Return empty so client falls back to local generateGreeting()
    return NextResponse.json({ greeting: '' }, { status: 500 });
  }
}
