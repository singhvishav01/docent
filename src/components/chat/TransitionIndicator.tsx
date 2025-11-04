'use client'

interface TransitionIndicatorProps {
  current: string | null
  next: string | null
  isTransitioning: boolean
  currentArtworkTitle?: string
  nextArtworkTitle?: string
}

export function TransitionIndicator({ 
  current, 
  next, 
  isTransitioning,
  currentArtworkTitle,
  nextArtworkTitle 
}: TransitionIndicatorProps) {
  if (!current && !next) {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-900">
                Now Viewing
              </span>
            </div>
            <span className="text-sm text-blue-700">
              {currentArtworkTitle || current || 'No artwork selected'}
            </span>
          </div>
          
          {next && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-orange-900">
                  Up Next
                </span>
              </div>
              <span className="text-sm text-orange-700">
                {nextArtworkTitle || next}
              </span>
            </div>
          )}
        </div>

        {isTransitioning && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium">Transitioning...</span>
          </div>
        )}
      </div>
    </div>
  )
}