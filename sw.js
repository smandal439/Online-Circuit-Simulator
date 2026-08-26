/* ═══════════════════════════════════════════════════════
   sw.js — Service Worker for ArduSim PWA
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'ardusim-v10';

// Compute base path dynamically so the SW works on both root domains
// (ardusim.app) and GitHub Pages subpaths (/Online-Circuit-Simulator/).
const BASE = self.registration.scope.replace(/\/[^/]*$/, '/');
const STATIC_ASSETS = [
  '',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/canvas.js',
  'js/editor.js',
  'js/simulator.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/output.js',
  'js/components/input.js',
  'js/components/actuators.js',
  'js/components/sensors.js',
  'js/components/passive.js',
  'js/components/power.js',
  'js/components/ics.js',
  'js/components/new_components.js',
  'js/components/multimeter.js',
  'js/components/function_generator.js',
  'js/serial.js',
  'js/output.js',
  'js/oscilloscope.js',
  'js/logic-analyzer.js',
  'js/plotter.js',
  'js/storage.js',
  'js/api.js',
  'js/utils.js',
  'js/thumbnails.js',
  'js/guide.js',
  'js/sharing.js',
  'js/safetyChecker.js',
  'favicon.ico',
].map(p => BASE + p);

// Install: cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Cache what we can, ignore failures
        return Promise.allSettled(
          STATIC_ASSETS.map((url) => cache.add(url).catch(() => {}))
        );
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API calls: network first
  if (url.pathname.endsWith('/api/execute') || url.pathname.endsWith('/api/examples')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // CDN resources (Monaco, fonts): cache-first
  if (url.hostname !== location.hostname) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // Static assets: network first, cache fallback (ensures fresh files)
  e.respondWith(
    fetch(e.request).then((resp) => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => {
      return caches.match(e.request).then((cached) => {
        if (cached) return cached;
        if (e.request.mode === 'navigate') {
          return caches.match(BASE + 'index.html');
        }
      });
    })
  );
});
