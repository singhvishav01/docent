import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { prepareForSpeech } from '@/lib/voice/speechCleanup';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: 'https://api.openai.com/v1' });

function addFillers(text: string): string {
  const wordCount = text.split(' ').length;
  if (wordCount < 20) return text;

  const thinkingFillers = ['Mm, ', 'Well, ', 'Ah, ', 'Right, ', 'So, '];
  const transitionFillers = ['and, uh, ', 'but, well, ', 'and sort of, '];

  let result = text;

  // 30% chance of thinking filler at start
  if (Math.random() < 0.3) {
    const filler = thinkingFillers[Math.floor(Math.random() * thinkingFillers.length)];
    result = filler + result.charAt(0).toLowerCase() + result.slice(1);
  }

  // 15% chance of one transition filler mid-response
  if (Math.random() < 0.15) {
    result = result.replace(
      /\b(And|But)\b/,
      () => transitionFillers[Math.floor(Math.random() * transitionFillers.length)]
    );
  }

  return result;
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) {
    return new Response('Missing text', { status: 400 });
  }
  const cleaned = addFillers(prepareForSpeech(text));
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'onyx',
    input: cleaned,
    speed: 0.95,
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  return new Response(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
    },
  });
}
