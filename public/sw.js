// Service Worker with advanced caching strategies
const CACHE_VERSION = 'v1';
const CACHE_NAME = `crm-blinkbliss-${CACHE_VERSION}`;
const API_CACHE = `crm-api-cache-${CACHE_VERSION}`;
const IMAGE_CACHE = `crm-image-cache-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/admin/dashboard',
  '/sales/dashboard',
  '/login',
  '/offline',
];

const API_ROUTES_TO_CACHE = [
  '/api/admin/leads',
  '/api/salesperson/leads',
  '/api/admin/reports/sales',
];

// Cache versioning for cleanup
const CACHE_NAMES = [CACHE_NAME, API_CACHE, IMAGE_CACHE];

// Install: Download and cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✨ Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !CACHE_NAMES.includes(name))
          .map((name) => {
            console.log(`🗑️ Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip HTTPS checks in dev
  if (request.method !== 'GET') {
    return event.respondWith(fetch(request));
  }

  // 2. Skip auth endpoints (always fresh)
  if (
    url.pathname.includes('/api/login') ||
    url.pathname.includes('/api/logout') ||
    url.pathname.includes('/api/force-logout')
  ) {
    return event.respondWith(fetch(request));
  }

  // 3. API routes: Network-first with cache fallback
  if (url.pathname.startsWith('/api')) {
    return event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok && API_ROUTES_TO_CACHE.some(r => url.pathname.includes(r))) {
            const cache = caches.open(API_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline fallback
            return new Response(
              JSON.stringify({ error: 'Offline - data unavailable' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
  }

  // 4. Images: Cache-first (images rarely change)
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif)$/)) {
    return event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(IMAGE_CACHE).then((cache) => {
                cache.put(request, response.clone());
              });
            }
            return response;
          })
        );
      })
    );
  }

  // 5. Static assets: Cache-first
  return event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request)
          .then((response) => {
            if (response.ok && (request.mode === 'navigate' || url.pathname.match(/\.(js|css|woff2?)$/))) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response.clone());
              });
            }
            return response;
          })
          .catch(() => {
            // Return offline page for HTML navigation
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('Offline', { status: 503 });
          })
      );
    })
  );
});

// Background sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-leads') {
    event.waitUntil(
      caches.open(API_CACHE).then((cache) => {
        return cache.match('/api/admin/leads').then((response) => {
          if (response) {
            // Attempt to sync
            return fetch('/api/admin/leads', {
              method: 'POST',
              body: response.body,
            });
          }
        });
      })
    );
  }
});
