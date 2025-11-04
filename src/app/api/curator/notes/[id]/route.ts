// src/app/api/curator/notes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, isCuratorOrAdmin, isAdmin } from '@/lib/auth'

// GET - Get single note
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!isCuratorOrAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const note = await db.curatorNote.findUnique({
      where: { id: params.id },
      include: {
        curator: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Curators can only view their own notes, admins can view all
    if (currentUser.role === 'curator' && note.curatorId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view this note' },
        { status: 403 }
      )
    }

    return NextResponse.json(note)

  } catch (error) {
    console.error('Get note error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    )
  }
}

// PATCH - Update note
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!isCuratorOrAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if note exists and user has permission
    const existingNote = await db.curatorNote.findUnique({
      where: { id: params.id }
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Curators can only edit their own notes, admins can edit all
    if (currentUser.role === 'curator' && existingNote.curatorId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to edit this note' },
        { status: 403 }
      )
    }

    const { content, type } = await req.json()

    if (!content && !type) {
      return NextResponse.json(
        { error: 'Nothing to update' },
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

    // Update the note
    const updatedNote = await db.curatorNote.update({
      where: { id: params.id },
      data: {
        ...(content && { content }),
        ...(type && { type })
      },
      include: {
        curator: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      message: 'Note updated successfully',
      note: updatedNote
    })

  } catch (error) {
    console.error('Update note error:', error)
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    )
  }
}

// DELETE - Delete note
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!isCuratorOrAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if note exists and user has permission
    const existingNote = await db.curatorNote.findUnique({
      where: { id: params.id }
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Curators can only delete their own notes, admins can delete all
    if (currentUser.role === 'curator' && existingNote.curatorId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this note' },
        { status: 403 }
      )
    }

    await db.curatorNote.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'Note deleted successfully'
    })

  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  }
}