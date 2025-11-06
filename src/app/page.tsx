// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0-1.125-.504-1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Docent</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/museums" className="text-gray-600 hover:text-blue-600 font-medium">
                Museums
              </Link>
              <Link href="/auth/signup" className="text-gray-600 hover:text-blue-600 font-medium">
                Sign Up
              </Link>
              <Link href="/auth/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Your AI Museum Guide
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover art with intelligent conversations. Scan QR codes or browse collections to start chatting with our AI about masterpieces from world-class museums.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/museums"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3V16.5m3-6V13.5m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Explore Museums
            </Link>
            
            <Link 
              href="/scan"
              className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Scan QR Code
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Intelligent Conversations</h3>
            <p className="text-gray-600">
              Ask questions about any artwork and get detailed, contextual answers powered by AI and expert curator notes.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">QR Code Scanning</h3>
            <p className="text-gray-600">
              Simply scan the QR code next to any artwork to instantly access detailed information and start a conversation.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0-1.125-.504-1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Museum Collections</h3>
            <p className="text-gray-600">
              Browse curated collections from world-renowned museums, each with rich contextual information and expert insights.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Try These Popular Artworks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link 
              href="/artwork/washington_crossing?museum=met"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-1">
                Washington Crossing the Delaware
              </h4>
              <p className="text-sm text-gray-600">Emanuel Leutze • 1851</p>
              <p className="text-xs text-gray-500 mt-2">Metropolitan Museum of Art</p>
            </Link>

            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
              <h4 className="font-semibold text-gray-500 mb-1">More artworks coming soon...</h4>
              <p className="text-sm text-gray-400">Add more JSON files to your data/museums folder</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
              <h4 className="font-semibold text-gray-500 mb-1">Your museum here</h4>
              <p className="text-sm text-gray-400">Contact us to add your collection</p>
            </div>
          </div>
        </div>

        {/* Role-based Access Info */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Museum Staff?</h3>
          <p className="text-gray-600 mb-6">Curator and admin tools are available after signing in</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Sign In to Access Staff Tools
            </Link>
          </div>
          <div className="mt-6 text-sm text-gray-600 bg-white rounded-lg p-4 max-w-2xl mx-auto">
            <p className="font-semibold mb-2">After signing in, you'll have access to:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-purple-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="font-medium text-purple-900">Curator Dashboard</span>
                  <p className="text-xs text-gray-500">Add and manage curator notes</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-gray-800 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">Admin Dashboard</span>
                  <p className="text-xs text-gray-500">Full museum management access</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500">
          <p>&copy; 2024 Docent. Powered by AI and expert knowledge.</p>
        </footer>
      </main>
    </div>
  );
}