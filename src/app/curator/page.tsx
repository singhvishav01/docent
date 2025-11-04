// src/app/curator/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Museum {
  id: string;
  name: string;
  description?: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function CuratorDashboard() {
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [museumsRes, userRes] = await Promise.all([
        fetch('/api/museums'),
        fetch('/api/auth/me')
      ]);

      if (museumsRes.ok) {
        const museumsData = await museumsRes.json();
        setMuseums(museumsData);
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading curator dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Curator Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {currentUser?.name || currentUser?.email}! Manage curator notes for artworks.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8h5" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Museums</p>
                <p className="text-2xl font-semibold text-gray-900">{museums.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Notes</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-sm font-semibold text-gray-900">Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Museums List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Select Museum</h2>
          </div>
          <div className="p-6">
            {museums.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No museums found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {museums.map((museum) => (
                  <Link
                    key={museum.id}
                    href={`/curator/museum/${museum.id}`}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-blue-300"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{museum.name}</h3>
                    {museum.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{museum.description}</p>
                    )}
                    <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                      <span>View Artworks</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions for Admins */}
        {currentUser?.role === 'admin' && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Admin Actions</h3>
            <div className="flex gap-4">
              <Link
                href="/admin/dashboard"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Admin Dashboard →
              </Link>
              <Link
                href="/admin/users"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Manage Users →
              </Link>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-700 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}