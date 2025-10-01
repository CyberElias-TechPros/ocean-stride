// Service Worker for offline capabilities and caching

const CACHE_NAME = 'ocean-stride-v1';
const STATIC_CACHE = 'ocean-stride-static-v1';
const DYNAMIC_CACHE = 'ocean-stride-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/cea.png',
  // Add other static assets as needed
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/companies$/,
  /\/api\/seafarers$/,
  /\/api\/vessels$/,
  /\/api\/dashboard\/stats$/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(STATIC_ASSETS);
      console.log('Service Worker: Static assets cached');

      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating');

  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const validCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE];

      await Promise.all(
        cacheNames.map(cacheName => {
          if (!validCaches.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      // Take control of all clients
      await self.clients.claim();
      console.log('Service Worker: Activated');
    })()
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    if (isStaticAsset(request)) {
      event.respondWith(cacheFirst(request));
    } else if (isApiRequest(request)) {
      event.respondWith(networkFirst(request));
    } else if (isImageRequest(request)) {
      event.respondWith(cacheFirst(request));
    } else {
      event.respondWith(staleWhileRevalidate(request));
    }
  }
});

// Cache strategies
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Cache first failed:', error);
    // Return offline fallback for certain requests
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    throw error;
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Network first failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for API requests
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Please check your connection.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf')
  );
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isImageRequest(request) {
  return request.destination === 'image' ||
         request.url.includes('.png') ||
         request.url.includes('.jpg') ||
         request.url.includes('.jpeg') ||
         request.url.includes('.gif') ||
         request.url.includes('.svg') ||
         request.url.includes('.webp');
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');

  if (event.tag === 'background-sync') {
    event.waitUntil(syncFailedRequests());
  }
});

async function syncFailedRequests() {
  try {
    const cache = await caches.open('failed-requests');
    const keys = await cache.keys();

    await Promise.all(
      keys.map(async (request) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.delete(request);
            console.log('Service Worker: Synced failed request:', request.url);
          }
        } catch (error) {
          console.log('Service Worker: Failed to sync request:', request.url, error);
        }
      })
    );
  } catch (error) {
    console.log('Service Worker: Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');

  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body || 'You have a new notification',
      icon: '/cea.png',
      badge: '/cea.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.id || 1,
        ...data
      },
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Ocean Stride', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_ASSETS':
      event.waitUntil(
        cacheAssets(payload.assets)
      );
      break;

    case 'INVALIDATE_CACHE':
      event.waitUntil(
        invalidateCache(payload.patterns)
      );
      break;

    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

async function cacheAssets(assets) {
  const cache = await caches.open(STATIC_CACHE);
  await cache.addAll(assets);
  console.log('Service Worker: Assets cached:', assets);
}

async function invalidateCache(patterns) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const keys = await cache.keys();

  await Promise.all(
    keys.map(async (request) => {
      if (patterns.some(pattern => pattern.test(request.url))) {
        await cache.delete(request);
      }
    })
  );

  console.log('Service Worker: Cache invalidated for patterns:', patterns);
}

// Periodic cleanup
setInterval(async () => {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const keys = await cache.keys();

    // Remove old entries (older than 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request);
        if (response) {
          const date = response.headers.get('date');
          if (date && new Date(date).getTime() < oneDayAgo) {
            await cache.delete(request);
          }
        }
      })
    );
  } catch (error) {
    console.log('Service Worker: Cleanup failed:', error);
  }
}, 60 * 60 * 1000); // Run every hour