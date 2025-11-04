'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
      // Verify artwork exists before navigating
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
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-medium text-gray-900 mb-2">Manual Entry</h3>
        <p className="text-sm text-gray-600">
          Enter the artwork ID found on the museum placard
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          placeholder="Enter artwork ID (e.g., ART-001)"
          value={artworkId}
          onChange={(e) => setArtworkId(e.target.value)}
          className="text-center"
        />
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Looking up artwork...
            </div>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Find Artwork
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
