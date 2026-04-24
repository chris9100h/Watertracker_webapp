// Wasser Tracker — Service Worker
// Simple app-shell + runtime cache for offline usage on iOS/Android.
const CACHE = 'wasser-tracker-v5';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache Supabase / Pushover / dynamic API calls
  if (url.hostname.includes('supabase.co') || url.hostname.includes('pushover.net')) {
    return;
  }

  // Network-first for navigations (so updates roll out fast)
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static assets
  ev.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
