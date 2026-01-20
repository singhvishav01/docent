// src/app/api/curator/notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, isCuratorOrAdmin } from '@/lib/auth'

// GET - List curator notes (filtered by curator or all for admin)
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!isCuratorOrAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized. Curator or admin access required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const artworkId = searchParams.get('artworkId')
    const museumId = searchParams.get('museumId')

    // Build query filters
    const where: any = {}
    
    // If not admin, only show their own notes
    if (currentUser?.role === 'curator') {
      where.curatorId = currentUser.id
    }

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    if (artworkId) {
      where.artworkId = artworkId
    }

    if (museumId) {
      where.museumId = museumId
    }

    const notes = await db.curatorNote.findMany({
      where,
      include: {
        curator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(notes)

  } catch (error) {
    console.error('Fetch notes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

// POST - Create new curator note
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !isCuratorOrAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized. Curator or admin access required.' },
        { status: 403 }
      )
    }

    const { artworkId, museumId, content, type } = await req.json()

    if (!artworkId || !museumId || !content) {
      return NextResponse.json(
        { error: 'artworkId, museumId, and content are required' },
        { status: 400 }
      )
    }

    const validTypes = ['interpretation', 'historical_context', 'technical_analysis', 'visitor_info']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create the note
    const note = await db.curatorNote.create({
      data: {
        artworkId,
        museumId,
        curatorId: currentUser.id,
        content,
        type: type || 'interpretation'
      },
      include: {
        curator: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      message: 'Note created successfully',
      note
    })

  } catch (error) {
    console.error('Create note error:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}