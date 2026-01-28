// src/app/admin/test-curator-notes/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function TestCuratorNotesPage() {
  const [museumId, setMuseumId] = useState('met');
  const [artworkId, setArtworkId] = useState('');
  const [testQuestion, setTestQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runTest = async () => {
    if (!artworkId || !testQuestion) {
      alert('Please enter both artwork ID and test question');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // First, get the artwork and its curator notes
      const artworkResponse = await fetch(`/api/artworks/${artworkId}?museum=${museumId}`);
      const artworkData = await artworkResponse.json();

      if (!artworkResponse.ok) {
        setResult({
          error: 'Artwork not found',
          details: artworkData
        });
        setLoading(false);
        return;
      }

      // Then, ask the question to the chat API
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testQuestion,
          artworkId: artworkId,
          museumId: museumId
        })
      });

      const chatData = await chatResponse.json();

      setResult({
        artwork: artworkData.artwork,
        curatorNotesCount: artworkData.artwork.curator_notes?.length || 0,
        curatorNotes: artworkData.artwork.curator_notes || [],
        contextUsed: chatData.context_used,
        curatorNotesInContext: chatData.curator_notes_count,
        aiResponse: chatData.response,
        question: testQuestion
      });

    } catch (error) {
      setResult({
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Link href="/admin/dashboard" className="hover:text-blue-600">
              Admin Dashboard
            </Link>
            <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>Test Curator Notes</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Curator Notes Integration</h1>
          <p className="text-gray-600">
            Verify that curator notes are being used in AI chat responses
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to Test
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Add a curator note with specific, unique information to an artwork</li>
            <li>Enter the artwork ID and museum below</li>
            <li>Ask a question that can only be answered using that curator note</li>
            <li>Check if the AI response includes the curator note information</li>
          </ol>
        </div>

        {/* Test Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Run Test</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Museum ID
                </label>
                <input
                  type="text"
                  value={museumId}
                  onChange={(e) => setMuseumId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="met, moma, louvre..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artwork ID
                </label>
                <input
                  type="text"
                  value={artworkId}
                  onChange={(e) => setArtworkId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="washington_crossing, starry_night..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Question
              </label>
              <textarea
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ask something that should be answered from curator notes..."
              />
            </div>

            <button
              onClick={runTest}
              disabled={loading || !artworkId || !testQuestion}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running Test...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Run Test
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {result.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
                <p className="text-red-700">{result.error}</p>
                {result.details && (
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <>
                {/* Artwork Info */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Artwork Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Title:</span>
                      <p className="text-gray-900">{result.artwork.title}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Artist:</span>
                      <p className="text-gray-900">{result.artwork.artist}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Curator Notes Count:</span>
                      <p className="text-gray-900">{result.curatorNotesCount}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Context Used:</span>
                      <p className={result.contextUsed ? 'text-green-600 font-semibold' : 'text-red-600'}>
                        {result.contextUsed ? '✅ Yes' : '❌ No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Curator Notes */}
                {result.curatorNotes.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Curator Notes ({result.curatorNotes.length})
                    </h3>
                    <div className="space-y-3">
                      {result.curatorNotes.map((note: any, idx: number) => (
                        <div key={idx} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">
                              {note.type || 'general'}
                            </span>
                            <span className="text-xs text-purple-600">
                              by {note.author || 'Unknown'}
                            </span>
                          </div>
                          <p className="text-sm text-purple-900">{note.note || note.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Results */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
                  
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Your Question:</span>
                    <p className="text-gray-900 mt-1 italic">"{result.question}"</p>
                  </div>

                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Curator Notes in Context:</span>
                    <p className="text-2xl font-bold mt-1">
                      {result.curatorNotesInContext}
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        out of {result.curatorNotesCount} total
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-700">AI Response:</span>
                    <div className="mt-2 bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-900 whitespace-pre-wrap">{result.aiResponse}</p>
                    </div>
                  </div>
                </div>

                {/* Verification Tips */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">
                    ✅ How to Verify
                  </h3>
                  <ul className="space-y-2 text-sm text-green-800">
                    <li>• Check if the AI response contains information from the curator notes</li>
                    <li>• Look for specific details that are ONLY in curator notes, not in the main description</li>
                    <li>• If the AI mentions curator insights, the system is working! ✨</li>
                    <li>• "Curator Notes in Context" should be greater than 0 if notes are being used</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link 
            href="/admin/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}