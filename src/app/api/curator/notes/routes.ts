import { NextRequest, NextResponse } from 'next/server';
import { getRAGInstance } from '@/lib/rag';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication (you might want to add role-based access here)
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { artworkId, museumId = 'default', content, curatorName, type = 'general' } = await req.json();

    if (!artworkId || !content || !curatorName) {
      return NextResponse.json(
        { error: 'artworkId, content, and curatorName are required' },
        { status: 400 }
      );
    }

    const rag = await getRAGInstance();
    const success = await rag.addCuratorNote(artworkId, museumId, {
      content,
      curator_name: curatorName,
      type
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add curator note' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Curator notes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
