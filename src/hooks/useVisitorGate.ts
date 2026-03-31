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
  const { isIdentified, isProfileLoading, visitorProfile } = useVisitor();
  const openGate = useVisitorGateStore(s => s.open);

  const requireIdentity = (): Promise<void> => {
    // Only bypass the gate if:
    // - profile has finished loading from DB, AND
    // - visitor is identified, AND
    // - intro has been completed
    if (!isProfileLoading && isIdentified && visitorProfile?.intro_complete === true) {
      return Promise.resolve();
    }

    // In all other cases open the gate.
    // If isProfileLoading is still true, VisitorGateModal will watch for it
    // and auto-resolve once the DB confirms intro_complete === true.
    return new Promise(resolve => {
      openGate(resolve);
    });
  };

  return { requireIdentity };
}
