// src/app/api/chat/greeting/route.ts
// Generates an AI-written greeting when a visitor arrives at an artwork
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '../../../../lib/db';
import { DOCENT_VOICE_PERSONA } from '../../../../lib/ai/docent-persona';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: 'https://api.openai.com/v1' });

export async function POST(req: NextRequest) {
  try {
    const { artworkId, museumId, visitorName, docentName } = await req.json();

    if (!artworkId || !museumId) {
      return NextResponse.json({ greeting: '' }, { status: 400 });
    }

    const artwork = await db.artwork.findFirst({
      where: { id: artworkId, museumId },
      include: { museum: { select: { name: true } } },
    });

    if (!artwork) {
      return NextResponse.json({ greeting: '' }, { status: 404 });
    }

    const curatorNotes = await db.curatorNote.findMany({
      where: { artworkId, museumId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const artworkContext = `CURRENT ARTWORK
Title:  ${artwork.title}
Artist: ${artwork.artist}${artwork.year ? `\nYear:   ${artwork.year}` : ''}${artwork.medium ? `\nMedium: ${artwork.medium}` : ''}${artwork.description ? `\nNotes:  ${artwork.description}` : ''}
Museum: ${artwork.museum.name}`;

    const curatorContext = curatorNotes.length > 0
      ? `\nCURATOR NOTES:\n${curatorNotes.map((n: any) => `[${n.type}] ${n.content}`).join('\n')}`
      : '';

    const visitorLine = visitorName
      ? `\nThe visitor's name is ${visitorName}. Use it once, naturally.`
      : '';

    const docentNameLine = docentName
      ? `\nIDENTITY: Your name is ${docentName}. If the visitor asks your name, confirm it naturally and warmly. Do not volunteer your name unless asked.`
      : '';

    const greetingInstruction = `This is the FIRST message the visitor will see. Do not repeat the persona rules back. Write a single, natural opening — 2 to 3 sentences maximum. You are standing with the visitor in front of this specific artwork right now. React to the artwork as if seeing it together for the first time. Use the visitor's name once if you have it. Do not say 'Hello' or 'Welcome'. Do not start with 'I'. Start with something that pulls them into the painting immediately.`;

    const systemPrompt = `${DOCENT_VOICE_PERSONA}\n\n${artworkContext}${curatorContext}${visitorLine}${docentNameLine}\n\n${greetingInstruction}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Greet me.' },
      ],
      max_tokens: 120,
      temperature: 0.85,
      stream: false,
    });

    const greeting = completion.choices[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({ greeting });
  } catch (error) {
    console.error('[greeting API] Error:', error);
    return NextResponse.json({ greeting: '' });
  }
}
