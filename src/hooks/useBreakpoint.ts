'use client';

import { useState, useEffect } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'mobile';
  if (window.matchMedia('(min-width: 1024px)').matches) return 'desktop';
  if (window.matchMedia('(min-width: 768px)').matches) return 'tablet';
  return 'mobile';
}

/**
 * Returns the current responsive breakpoint as a string.
 * SSR-safe: defaults to 'mobile' on the server.
 * Uses matchMedia listeners — no polling.
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    const mqTablet = window.matchMedia('(min-width: 768px)');
    const mqDesktop = window.matchMedia('(min-width: 1024px)');

    const update = () => setBreakpoint(getBreakpoint());

    mqTablet.addEventListener('change', update);
    mqDesktop.addEventListener('change', update);

    // Sync once on mount in case SSR defaulted to wrong value
    update();

    return () => {
      mqTablet.removeEventListener('change', update);
      mqDesktop.removeEventListener('change', update);
    };
  }, []);

  return breakpoint;
}
