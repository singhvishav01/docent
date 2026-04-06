'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on first mount.
 * Rendered once in ClientProviders — no visible output.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('[SW] Registered:', reg.scope))
        .catch(err => console.error('[SW] Registration failed:', err));
    }
  }, []);

  return null;
}
