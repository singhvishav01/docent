/**
 * docent Service Worker
 *
 * Strategy: network-first for everything, with cache fallback.
 * Skips caching for real-time API calls (Deepgram, OpenAI, chat).
 */

const CACHE_NAME = 'docent-v1';

const NEVER_CACHE = [
  '/api/deepgram-token',
  '/api/chat',
  '/api/tts',
  'api.openai.com',
  'api.deepgram.com',
];

function shouldSkip(url) {
  return NEVER_CACHE.some(pattern => url.includes(pattern));
}

// Install — take control immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate — clean old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (shouldSkip(event.request.url)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache successful same-origin or image responses
        if (
          response.ok &&
          (event.request.url.startsWith(self.location.origin) ||
           event.request.destination === 'image')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
