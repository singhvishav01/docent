// POST /api/chat/summarize
// Condenses older conversation turns into a single context sentence.
// Called as a background fire-and-forget — never blocks the user's response.
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, baseURL: 'https://api.openai.com/v1' });

export async function POST(req: NextRequest) {
  try {
    const { messages, artworkTitle } = await req.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      artworkTitle?: string;
    };

    if (!messages?.length) {
      return NextResponse.json({ summary: '' });
    }

    const artworkLine = artworkTitle ? ` while discussing "${artworkTitle}"` : '';

    const formatted = messages
      .map(m => `${m.role === 'user' ? 'Visitor' : 'Docent'}: ${m.content}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 80,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `Summarize the following museum conversation${artworkLine} in ONE concise sentence. Focus on what the visitor revealed — their interests, questions, reactions, and anything personal they shared. Be specific, not generic. Output only the sentence, no preamble.`,
        },
        { role: 'user', content: formatted },
      ],
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[summarize] error:', error);
    return NextResponse.json({ summary: '' });
  }
}
