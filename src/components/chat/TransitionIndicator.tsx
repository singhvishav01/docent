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
  if (!current && !next) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: next ? '6px' : 0 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>NOW</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '13px', fontStyle: 'italic', color: 'rgba(242,232,213,0.7)' }}>
            {currentArtworkTitle || current || 'No artwork selected'}
          </span>
        </div>

        {next && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.4)' }}>NEXT</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '13px', fontStyle: 'italic', color: 'rgba(242,232,213,0.45)' }}>
              {nextArtworkTitle || next}
            </span>
          </div>
        )}
      </div>

      {isTransitioning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(201,168,76,0.6)' }}>
          <div style={{ width: '14px', height: '14px', border: '1px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em' }}>TRANSITIONING</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  )
}
