// Service worker: κάνει την εφαρμογή να ανοίγει και χωρίς ίντερνετ.
const CACHE = 'dentnotes-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable.png'];

self.addEventListener('install', e => {
  // cache:'reload' → παίρνουμε πάντα φρέσκα αρχεία από τον server, όχι από την προσωρινή μνήμη του browser.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Σελίδα: πάντα η πιο πρόσφατη έκδοση από το δίκτυο (χωρίς προσωρινή μνήμη), αλλιώς από cache.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }).then(res => {
        if (res.redirected) return Response.redirect(res.url, 302);
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
        }
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Υπόλοιπα αρχεία: πρώτα cache.
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok && !res.redirected) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
