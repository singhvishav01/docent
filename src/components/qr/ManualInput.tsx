'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { toast } from 'react-hot-toast'

export function ManualInput() {
  const [artworkId, setArtworkId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!artworkId.trim()) {
      toast.error('Please enter an artwork ID')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`/api/artworks/${encodeURIComponent(artworkId.trim())}`)
      if (response.ok) {
        router.push(`/artwork/${encodeURIComponent(artworkId.trim())}`)
        toast.success('Artwork found!')
      } else if (response.status === 404) {
        toast.error('Artwork not found. Please check the ID and try again.')
      } else {
        toast.error('Failed to verify artwork. Please try again.')
      }
    } catch (error) {
      console.error('Artwork lookup error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Enter artwork ID (e.g., ART-001)"
            value={artworkId}
            onChange={e => setArtworkId(e.target.value)}
            style={{
              display: 'block', width: '100%', padding: '12px 14px',
              background: 'rgba(242,232,213,0.04)',
              border: '1px solid rgba(201,168,76,0.15)',
              outline: 'none',
              fontFamily: "'Raleway', sans-serif", fontSize: '13px', fontWeight: 300,
              color: '#F2E8D5', letterSpacing: '0.04em', textAlign: 'center',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)')}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', padding: '12px',
            background: isLoading ? 'rgba(201,168,76,0.2)' : '#C9A84C',
            border: 'none', cursor: isLoading ? 'default' : 'pointer',
            fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em',
            color: isLoading ? 'rgba(201,168,76,0.4)' : '#0D0A07',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = '#F2E8D5'; }}
          onMouseLeave={e => { if (!isLoading) e.currentTarget.style.background = '#C9A84C'; }}
        >
          {isLoading ? (
            <>
              <div style={{ width: '14px', height: '14px', border: '1px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              SEARCHING...
            </>
          ) : (
            <>
              <Search size={14} />
              FIND ARTWORK
            </>
          )}
        </button>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
