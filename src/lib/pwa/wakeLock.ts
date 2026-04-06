/**
 * Screen Wake Lock — keeps the display on during a museum tour.
 *
 * The Wake Lock is automatically re-acquired when the app becomes
 * visible again (e.g., after the user checks a notification).
 *
 * Usage:
 *   const lock = createWakeLock();
 *   await lock.acquire();   // call when tour starts
 *   await lock.release();   // call when tour ends
 */

export interface WakeLockHandle {
  acquire: () => Promise<void>;
  release: () => Promise<void>;
  isActive: () => boolean;
}

export function createWakeLock(): WakeLockHandle {
  let sentinel: WakeLockSentinel | null = null;
  let desired = false;

  async function acquire() {
    desired = true;
    if (!('wakeLock' in navigator)) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
    } catch {
      // Not available (low battery, page not visible, etc.) — silently skip
    }
  }

  async function release() {
    desired = false;
    if (sentinel) {
      await sentinel.release().catch(() => {});
      sentinel = null;
    }
  }

  // Re-acquire when page becomes visible again (OS releases it on hide)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && desired && !sentinel) {
        await acquire();
      }
    });
  }

  return {
    acquire,
    release,
    isActive: () => sentinel !== null,
  };
}

// Singleton for use across the app
export const wakeLock = createWakeLock();
