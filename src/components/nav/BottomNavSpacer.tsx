'use client';

import { useBottomNavVisible, BOTTOM_NAV_HEIGHT } from './useBottomNavVisible';

/**
 * Invisible spacer added at the end of scrollable pages.
 * Prevents content from being obscured by the fixed bottom nav bar.
 */
export function BottomNavSpacer() {
  const { visible } = useBottomNavVisible();
  if (!visible) return null;
  return (
    <div
      aria-hidden="true"
      style={{ height: `calc(env(safe-area-inset-bottom) + ${BOTTOM_NAV_HEIGHT + 16}px)` }}
    />
  );
}
