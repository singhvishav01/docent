// src/app/api/admin/artwork/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, isCuratorOrAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!isCuratorOrAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin or curator access required.' },
        { status: 403 }
      );
    }

    const { artwork, museumId }: { artwork: any; museumId: string } = await request.json();
    
    if (!artwork || !museumId) {
      return NextResponse.json(
        { error: 'Artwork data and museum ID are required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!artwork.id || !artwork.title || !artwork.artist) {
      return NextResponse.json(
        { error: 'ID, title, and artist are required fields' },
        { status: 400 }
      );
    }

    // Check if museum exists
    const museum = await db.museum.findUnique({
      where: { id: museumId }
    });

    if (!museum) {
      return NextResponse.json(
        { error: 'Museum not found' },
        { status: 404 }
      );
    }

    // Check if artwork already exists
    const existingArtwork = await db.artwork.findUnique({
      where: {
        museumId_id: {
          museumId: museumId,
          id: artwork.id
        }
      }
    });

    if (existingArtwork) {
      return NextResponse.json(
        { error: 'An artwork with this ID already exists in this museum' },
        { status: 409 }
      );
    }

    // Create the artwork
    const createdArtwork = await db.artwork.create({
      data: {
        museumId: museumId,
        id: artwork.id,
        title: artwork.title,
        artist: artwork.artist,
        year: artwork.year || null,
        medium: artwork.medium || null,
        dimensions: artwork.dimensions || null,
        description: artwork.description || null,
        provenance: artwork.provenance || null,
        imageUrl: artwork.image_url || null,
        gallery: artwork.gallery || null,
        accessionNumber: artwork.accession_number || null,
        period: artwork.period || null,
        qrCode: artwork.id, // Use artwork ID as QR code by default
      }
    });

    // Handle curator notes if provided
    if (artwork.curator_notes && artwork.curator_notes.length > 0 && currentUser) {
      for (const note of artwork.curator_notes) {
        await db.curatorNote.create({
          data: {
            artworkId: artwork.id,
            museumId: museumId,
            curatorId: currentUser.id,
            content: note.content,
            type: note.type || 'interpretation'
          }
        });
      }
    }

    return NextResponse.json({ 
      message: 'Artwork created successfully',
      artwork: createdArtwork
    });

  } catch (error) {
    console.error('Create artwork error:', error);
    return NextResponse.json(
      { error: 'Failed to create artwork', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!isCuratorOrAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin or curator access required.' },
        { status: 403 }
      );
    }

    const { artwork, museumId }: { artwork: any; museumId: string } = await request.json();
    
    if (!artwork || !museumId) {
      return NextResponse.json(
        { error: 'Artwork data and museum ID are required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!artwork.id || !artwork.title || !artwork.artist) {
      return NextResponse.json(
        { error: 'ID, title, and artist are required fields' },
        { status: 400 }
      );
    }

    // Check if museum exists
    const museum = await db.museum.findUnique({
      where: { id: museumId }
    });

    if (!museum) {
      return NextResponse.json(
        { error: 'Museum not found' },
        { status: 404 }
      );
    }

    // Check if artwork exists
    const existingArtwork = await db.artwork.findUnique({
      where: {
        museumId_id: {
          museumId: museumId,
          id: artwork.id
        }
      }
    });

    if (!existingArtwork) {
      return NextResponse.json(
        { error: 'Artwork not found' },
        { status: 404 }
      );
    }

    // Update the artwork
    const updatedArtwork = await db.artwork.update({
      where: {
        museumId_id: {
          museumId: museumId,
          id: artwork.id
        }
      },
      data: {
        title: artwork.title,
        artist: artwork.artist,
        year: artwork.year || null,
        medium: artwork.medium || null,
        dimensions: artwork.dimensions || null,
        description: artwork.description || null,
        provenance: artwork.provenance || null,
        imageUrl: artwork.image_url || null,
        gallery: artwork.gallery || null,
        accessionNumber: artwork.accession_number || null,
        period: artwork.period || null,
      }
    });

    // Handle curator notes update
if (artwork.curator_notes && currentUser) {
  // Get existing notes
  const existingNotes = await db.curatorNote.findMany({
    where: {
      artworkId: artwork.id,
      museumId: museumId
    }
  });

  // Separate notes into existing (with id) and new (without id)
  const notesWithIds: any[] = [];
  const notesWithoutIds: any[] = [];
  
  artwork.curator_notes.forEach((note: any) => {
    if (note.id && note.id.startsWith('note_')) {
      // This is an existing note from the database
      notesWithIds.push(note);
    } else {
      // This is a new note being added
      notesWithoutIds.push(note);
    }
  });

  // Find notes to delete (existing notes not in the updated list)
  const updatedNoteIds = notesWithIds.map(n => n.id);
  const notesToDelete = existingNotes.filter(
    note => !updatedNoteIds.includes(note.id)
  );

  // Delete removed notes
  for (const note of notesToDelete) {
    await db.curatorNote.delete({
      where: { id: note.id }
    });
  }

  // Update existing notes
  for (const note of notesWithIds) {
    try {
      // Verify the note exists before updating
      const existingNote = await db.curatorNote.findUnique({
        where: { id: note.id }
      });
      
      if (existingNote) {
        await db.curatorNote.update({
          where: { id: note.id },
          data: {
            content: note.content,
            type: note.type || 'interpretation'
          }
        });
      }
    } catch (error) {
      console.error(`Failed to update note ${note.id}:`, error);
      // Continue with other notes even if one fails
    }
  }

  // Create new notes
  for (const note of notesWithoutIds) {
    if (note.content && note.content.trim()) {
      await db.curatorNote.create({
        data: {
          artworkId: artwork.id,
          museumId: museumId,
          curatorId: currentUser.id,
          content: note.content,
          type: note.type || 'interpretation'
        }
      });
    }
  }
}

    return NextResponse.json({ 
      message: 'Artwork updated successfully',
      artwork: updatedArtwork
    });

  } catch (error) {
    console.error('Update artwork error:', error);
    return NextResponse.json(
      { error: 'Failed to update artwork', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!isCuratorOrAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin or curator access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const artworkId = searchParams.get('id');
    const museumId = searchParams.get('museum');

    if (!artworkId || !museumId) {
      return NextResponse.json(
        { error: 'Artwork ID and museum ID are required' },
        { status: 400 }
      );
    }

    // Check if artwork exists
    const existingArtwork = await db.artwork.findUnique({
      where: {
        museumId_id: {
          museumId: museumId,
          id: artworkId
        }
      }
    });

    if (!existingArtwork) {
      return NextResponse.json(
        { error: 'Artwork not found' },
        { status: 404 }
      );
    }

    // Delete the artwork (curator notes will cascade delete due to schema)
    await db.artwork.delete({
      where: {
        museumId_id: {
          museumId: museumId,
          id: artworkId
        }
      }
    });

    return NextResponse.json({ 
      message: 'Artwork deleted successfully'
    });

  } catch (error) {
    console.error('Delete artwork error:', error);
    return NextResponse.json(
      { error: 'Failed to delete artwork', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}