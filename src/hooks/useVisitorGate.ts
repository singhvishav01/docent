'use client';

import { useVisitor } from '@/contexts/VisitorContext';
import { useVisitorGateStore } from '@/components/auth/VisitorGateModal';

/**
 * Returns a function that ensures the visitor is identified AND has completed
 * the acquaintance intro before proceeding.
 *
 * - First-time visitors: full flow (choice → name → docent → intro)
 * - Returning visitors who completed intro: pass through immediately
 * - Returning visitors who skipped intro somehow: jump straight to intro
 *
 * Waits for the profile to finish loading from DB before deciding, so a
 * registered user whose intro_complete=true doesn't get the gate flashed at them.
 */
export function useVisitorGate() {
  const { isIdentified, isProfileLoading, visitorProfile, visitorType } = useVisitor();
  const openGate = useVisitorGateStore(s => s.open);

  const requireIdentity = (): Promise<void> => {
    // Bypass for any visitor (guest or registered) who has completed onboarding.
    // Guests use sessionStorage so intro_complete is only true within the same tab session —
    // a new tab or browser session will start fresh (correct behaviour for shared devices).
    if (!isProfileLoading && isIdentified && visitorProfile?.intro_complete === true) {
      return Promise.resolve();
    }

    // Registered users: also bypass while profile is still loading from DB, then
    // VisitorGateModal will auto-resolve once DB confirms intro_complete === true.
    if (isProfileLoading && visitorType === 'registered') {
      return new Promise(resolve => {
        openGate(resolve);
      });
    }

    // All other cases: open the gate.
    return new Promise(resolve => {
      openGate(resolve);
    });
  };

  return { requireIdentity };
}
