import { TestChat } from '@/components/admin/TestChat'
import { getAllArtworks } from '@/lib/db'

export default async function TestChatPage() {
  const artworks = await getAllArtworks()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Admin Test Chat
            </h1>
            <p className="text-gray-600">
              Test chat functionality and auto-transitions without QR scanning.
            </p>
          </div>

          <TestChat artworks={artworks} />
        </div>
      </div>
    </div>
  )
}
