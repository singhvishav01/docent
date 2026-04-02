/**
 * POST /api/deepgram-token
 *
 * Returns the Deepgram API key for client-side use.
 * The master DEEPGRAM_API_KEY stays server-side only.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  const masterKey = process.env.DEEPGRAM_API_KEY;
  if (!masterKey || masterKey === 'your_deepgram_api_key_here') {
    return NextResponse.json({ error: 'Deepgram not configured' }, { status: 500 });
  }

  return NextResponse.json({ key: masterKey });
}
