/**
 * GET  /api/profile/personality  — load saved profile for the logged-in user
 * POST /api/profile/personality  — upsert profile for the logged-in user
 *
 * Guests (no auth-token) get 401 — they rely on localStorage only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const record = await db.visitorPersonality.findUnique({
    where: { userId: auth.userId },
  });

  if (!record) return NextResponse.json({ profile: null, docentName: null });

  return NextResponse.json({
    profile: record.profile,
    docentName: record.docentName,
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { profile?: unknown; docentName?: string | null };
  try {
    // sendBeacon may send the body as text/plain — handle both
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('text/plain')) {
      body = JSON.parse(await req.text());
    } else {
      body = await req.json();
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { profile, docentName } = body;
  if (!profile) return NextResponse.json({ error: 'profile is required' }, { status: 400 });

  const record = await db.visitorPersonality.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      profile,
      docentName: docentName ?? null,
    },
    update: {
      profile,
      docentName: docentName ?? null,
    },
  });

  return NextResponse.json({ ok: true, updatedAt: record.updatedAt });
}
