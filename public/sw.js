/**
 * DOCENT Service Worker — passive shell.
 *
 * Exists to satisfy PWA installability requirements.
 * No caching during development — all requests go straight to the network.
 * Caching strategy will be added before production.
 */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  // Clear any old caches from previous SW versions
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// No fetch handler — let every request go through to the network normally.
