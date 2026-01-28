// src/app/curator/artwork/[id]/edit/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface CuratorNote {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  curator: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Artwork {
  id: string;
  title: string;
  artist: string;
  year?: number;
  description?: string;
  image_url?: string;
}

export default function CuratorEditArtworkPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const artworkId = params.id;
  const museumId = searchParams.get('museum') || '';
  
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [notes, setNotes] = useState<CuratorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // Form state
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('interpretation');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [artworkId, museumId]);

  const loadData = async () => {
    try {
      const [artworkRes, notesRes] = await Promise.all([
        fetch(`/api/artworks/${artworkId}?museum=${museumId}`),
        fetch(`/api/curator/notes?artworkId=${artworkId}&museumId=${museumId}`)
      ]);

      if (artworkRes.ok) {
        const data = await artworkRes.json();
        setArtwork(data.artwork);
      }

      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/curator/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId,
          museumId,
          content: noteContent,
          type: noteType
        })
      });

      if (response.ok) {
        setNoteContent('');
        setNoteType('interpretation');
        setShowAddForm(false);
        await loadData();
      } else {
        const error = await response.json();
        alert('Failed to add note: ' + error.error);
      }
    } catch (error) {
      alert('Failed to add note: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditNote = (note: CuratorNote) => {
    setEditingNoteId(note.id);
    setNoteContent(note.content);
    setNoteType(note.type);
    setShowAddForm(true);
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !editingNoteId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/curator/notes/${editingNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteContent,
          type: noteType
        })
      });

      if (response.ok) {
        setNoteContent('');
        setNoteType('interpretation');
        setEditingNoteId(null);
        setShowAddForm(false);
        await loadData();
      } else {
        const error = await response.json();
        alert('Failed to update note: ' + error.error);
      }
    } catch (error) {
      alert('Failed to update note: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/curator/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData();
      } else {
        const error = await response.json();
        alert('Failed to delete note: ' + error.error);
      }
    } catch (error) {
      alert('Failed to delete note: ' + error);
    }
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setNoteContent('');
    setNoteType('interpretation');
    setShowAddForm(false);
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'interpretation': return 'bg-blue-100 text-blue-800';
      case 'historical_context': return 'bg-purple-100 text-purple-800';
      case 'technical_analysis': return 'bg-green-100 text-green-800';
      case 'visitor_info': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading artwork...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Link href="/curator" className="hover:text-blue-600">Curator Dashboard</Link>
            <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href={`/curator/museum/${museumId}`} className="hover:text-blue-600">Museum</Link>
            <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>{artwork?.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{artwork?.title}</h1>
          <p className="text-gray-600 text-lg">{artwork?.artist} {artwork?.year && `(${artwork.year})`}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Artwork Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              {artwork?.image_url && (
                <img
                  src={artwork.image_url}
                  alt={artwork.title}
                  className="w-full rounded-lg mb-4"
                />
              )}
              <h3 className="font-semibold text-gray-900 mb-2">About</h3>
              <p className="text-sm text-gray-600">{artwork?.description}</p>
            </div>
          </div>

          {/* Right: Notes Management */}
          <div className="lg:col-span-2">
            {/* Add Note Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Curator Note
              </button>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingNoteId ? 'Edit Note' : 'Add New Note'}
                </h3>
                <form onSubmit={editingNoteId ? handleUpdateNote : handleAddNote}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note Type
                    </label>
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="interpretation">Interpretation</option>
                      <option value="historical_context">Historical Context</option>
                      <option value="technical_analysis">Technical Analysis</option>
                      <option value="visitor_info">Visitor Information</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note Content
                    </label>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      rows={6}
                      placeholder="Add your curator insights, observations, or context..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : editingNoteId ? 'Update Note' : 'Add Note'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notes List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Curator Notes ({notes.length})
              </h3>
              
              {notes.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600">No curator notes yet. Be the first to add one!</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getNoteTypeColor(note.type)}`}>
                        {note.type.replace('_', ' ')}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{note.content}</p>
                    
                    <div className="text-xs text-gray-500">
                      By {note.curator.name || note.curator.email} • {new Date(note.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link 
            href={`/curator/museum/${museumId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Artworks
          </Link>
        </div>
      </div>
    </div>
  );
}