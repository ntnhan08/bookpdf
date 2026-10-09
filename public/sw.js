const CACHE_NAME = 'pdf-reader-v2';

// Install event - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip external requests (CDN, etc.)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      // Fetch from network in background and update cache
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => null);

      // Return cache immediately if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Wait for network response
      const networkResponse = await fetchPromise;
      
      if (networkResponse && networkResponse.status === 200) {
        return networkResponse;
      }

      // Fallback for navigation requests
      if (event.request.mode === 'navigate') {
        const fallback = await cache.match('/index.html');
        if (fallback) return fallback;
      }

      return new Response('Offline - PDF Book Reader', { 
        status: 503,
        statusText: 'Service Unavailable'
      });
    })
  );
});
