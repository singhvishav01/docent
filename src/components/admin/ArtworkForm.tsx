'use client';
import { useState, useEffect } from 'react';
import { ArtworkData, Museum, CuratorNote } from '@/lib/rag/types';

interface ArtworkFormProps {
  artwork?: ArtworkData;
  museums: Museum[];
  onSubmit: (artwork: ArtworkData, museumId: string) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export function ArtworkForm({ artwork, museums, onSubmit, onCancel, isEditing = false }: ArtworkFormProps) {
  const [formData, setFormData] = useState<Partial<ArtworkData> & { museumId: string }>({
    id: artwork?.id || '',
    title: artwork?.title || '',
    artist: artwork?.artist || '',
    year: artwork?.year || undefined,
    medium: artwork?.medium || '',
    dimensions: artwork?.dimensions || '',
    description: artwork?.description || '',
    location: artwork?.location || '',
    provenance: artwork?.provenance || '',
    image_url: artwork?.image_url || '',
    gallery: artwork?.gallery || '',
    accession_number: artwork?.accession_number || '',
    period: artwork?.period || '',
    museumId: artwork?.museum || (museums[0]?.id || '')
  });

  const [curatorNotes, setCuratorNotes] = useState<CuratorNote[]>(artwork?.curator_notes || []);
  const [newNote, setNewNote] = useState({ content: '', type: 'interpretation' as 'interpretation' | 'historical_context' | 'technical_analysis' | 'visitor_info' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id?.trim()) {
      newErrors.id = 'Artwork ID is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.id)) {
      newErrors.id = 'ID can only contain letters, numbers, underscores, and dashes';
    }

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.artist?.trim()) {
      newErrors.artist = 'Artist is required';
    }

    if (!formData.museumId) {
      newErrors.museumId = 'Museum is required';
    }

    if (formData.year && (formData.year < -5000 || formData.year > new Date().getFullYear())) {
      newErrors.year = 'Please enter a valid year';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const artworkData: ArtworkData = {
        id: formData.id!.trim(),
        title: formData.title!.trim(),
        artist: formData.artist!.trim(),
        year: formData.year,
        medium: formData.medium?.trim(),
        dimensions: formData.dimensions?.trim(),
        description: formData.description?.trim(),
        location: formData.location?.trim(),
        provenance: formData.provenance?.trim(),
        image_url: formData.image_url?.trim(),
        gallery: formData.gallery?.trim(),
        accession_number: formData.accession_number?.trim(),
        period: formData.period?.trim(),
        curator_notes: curatorNotes,
        created_at: artwork?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await onSubmit(artworkData, formData.museumId);
    } catch (error) {
      console.error('Failed to save artwork:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save artwork' });
    } finally {
      setLoading(false);
    }
  };

  const addCuratorNote = () => {
    if (!newNote.content.trim()) return;

    const note: CuratorNote = {
      id: Date.now().toString(),
      content: newNote.content.trim(),
      curator_name: 'Admin', // TODO: Get from auth context
      created_at: new Date().toISOString(),
      type: newNote.type
    };

    setCuratorNotes([...curatorNotes, note]);
    setNewNote({ content: '', type: 'interpretation' });
  };

  const removeCuratorNote = (noteId: string) => {
    setCuratorNotes(curatorNotes.filter(note => note.id !== noteId));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Artwork' : 'Add New Artwork'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Artwork ID *
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md ${errors.id ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="e.g., mona_lisa, starry_night"
              disabled={isEditing}
            />
            {errors.id && <p className="mt-1 text-sm text-red-600">{errors.id}</p>}
            {!isEditing && (
              <p className="mt-1 text-xs text-gray-500">
                Use lowercase letters, numbers, underscores, and dashes only. Cannot be changed after creation.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Museum *
            </label>
            <select
              value={formData.museumId}
              onChange={(e) => setFormData({ ...formData, museumId: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md ${errors.museumId ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select a museum</option>
              {museums.map((museum) => (
                <option key={museum.id} value={museum.id}>
                  {museum.name}
                </option>
              ))}
            </select>
            {errors.museumId && <p className="mt-1 text-sm text-red-600">{errors.museumId}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Artwork title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Artist *
            </label>
            <input
              type="text"
              value={formData.artist}
              onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md ${errors.artist ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Artist name"
            />
            {errors.artist && <p className="mt-1 text-sm text-red-600">{errors.artist}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <input
              type="number"
              value={formData.year || ''}
              onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : undefined })}
              className={`w-full px-3 py-2 border rounded-md ${errors.year ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="e.g., 1889"
            />
            {errors.year && <p className="mt-1 text-sm text-red-600">{errors.year}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medium
            </label>
            <input
              type="text"
              value={formData.medium}
              onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Oil on canvas"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dimensions
            </label>
            <input
              type="text"
              value={formData.dimensions}
              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 77 cm × 53 cm"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Detailed description of the artwork..."
          />
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gallery Location
            </label>
            <input
              type="text"
              value={formData.gallery}
              onChange={(e) => setFormData({ ...formData, gallery: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Gallery 3, Salle des États"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accession Number
            </label>
            <input
              type="text"
              value={formData.accession_number}
              onChange={(e) => setFormData({ ...formData, accession_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 472.1941, 779"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period/Movement
            </label>
            <input
              type="text"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Post-Impressionism, Italian Renaissance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        {/* Provenance */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provenance
          </label>
          <textarea
            value={formData.provenance}
            onChange={(e) => setFormData({ ...formData, provenance: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ownership history and acquisition details..."
          />
        </div>

        {/* Curator Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Curator Notes
          </label>
          
          {/* Existing Notes */}
          {curatorNotes.length > 0 && (
            <div className="space-y-3 mb-4">
              {curatorNotes.map((note) => (
                <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {note.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {note.curator_name} • {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{note.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCuratorNote(note.id)}
                      className="text-red-600 hover:text-red-800 ml-2"
                      title="Remove note"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Note */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Note Type
                </label>
                <select
                  value={newNote.type}
                  onChange={(e) => setNewNote({ ...newNote, type: e.target.value as 'interpretation' | 'historical_context' | 'technical_analysis' | 'visitor_info' })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="interpretation">Interpretation</option>
                  <option value="historical_context">Historical Context</option>
                  <option value="technical_analysis">Technical Analysis</option>
                  <option value="visitor_info">Visitor Information</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Note Content
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add curator insights, historical context, or technical details..."
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addCuratorNote}
              disabled={!newNote.content.trim()}
              className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Note
            </button>
          </div>
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : (
              isEditing ? 'Update Artwork' : 'Create Artwork'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}