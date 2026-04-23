'use client';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useSession } from '@/contexts/SessionProvider';
import { usePathname } from 'next/navigation';

export const BOTTOM_NAV_HEIGHT = 56;

/**
 * Controls bottom nav visibility and exports its height for padding calculations.
 * Single source of truth — used by BottomNavBar, PersistentChatInterface, and BottomNavSpacer.
 */
export function useBottomNavVisible(): { visible: boolean; height: number } {
  const breakpoint = useBreakpoint();
  const { isVoiceTourActive } = useSession();
  const pathname = usePathname();

  if (breakpoint !== 'mobile') return { visible: false, height: 0 };

  // Admin, curator, and auth pages don't need the visitor nav
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/curator') ||
    pathname.startsWith('/auth')
  ) {
    return { visible: false, height: 0 };
  }

  // On artwork pages, collapse when voice tour is active to free up the thumb zone
  if (pathname.startsWith('/artwork/') && isVoiceTourActive) {
    return { visible: false, height: 0 };
  }

  return { visible: true, height: BOTTOM_NAV_HEIGHT };
}
