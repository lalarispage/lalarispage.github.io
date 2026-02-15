// Service Worker untuk PWA Toko Online - AUTO UPDATE VERSION
// Cache akan otomatis update tanpa perlu ubah versi manual

// Gunakan timestamp atau hash untuk auto-versioning
const CACHE_VERSION = 'v1'; // Hanya ubah ini jika ingin force update
const CACHE_NAME = `toko-online-${CACHE_VERSION}-${self.registration.scope}`;
const OFFLINE_URL = '/offline.html';

// Strategy: Stale While Revalidate - selalu ambil dari cache dulu, update di background
const CACHE_STRATEGY = 'stale-while-revalidate'; // atau 'network-first' atau 'cache-first'

// Max cache age (dalam milidetik) - cache otomatis expire setelah waktu ini
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 jam

// Daftar file yang akan di-cache saat install (static assets)
const staticAssets = [
  '/',
  '/offline.html',
  'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css',
  'https://code.jquery.com/jquery-3.5.1.slim.min.js',
  'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js'
];

// File yang tidak perlu di-cache
const EXCLUDED_URLS = [
  '/blogger_dynamic',
  '/b/post-preview',
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net'
];

// ========== INSTALL SERVICE WORKER ==========
self.addEventListener('install', event => {
  console.log('✅ Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Caching static assets');
        return cache.addAll(staticAssets.map(url => new Request(url, {cache: 'reload'})));
      })
      .then(() => {
        console.log('✅ Service Worker: Skip waiting - activate immediately');
        return self.skipWaiting(); // Activate immediately, jangan tunggu tab ditutup
      })
      .catch(err => {
        console.error('❌ Service Worker: Cache installation failed', err);
      })
  );
});

// ========== ACTIVATE SERVICE WORKER ==========
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Hapus cache lama
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim semua clients
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker: Activated and ready!');
    })
  );
});

// ========== FETCH STRATEGY ==========
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip requests yang tidak perlu di-cache
  if (shouldSkipCache(url)) {
    return;
  }

  // Skip cross-origin yang bukan CDN
  if (!url.origin.includes(self.location.origin) && 
      !isCDNResource(url.href)) {
    return;
  }

  // Pilih strategy berdasarkan tipe request
  if (CACHE_STRATEGY === 'stale-while-revalidate') {
    event.respondWith(staleWhileRevalidate(request));
  } else if (CACHE_STRATEGY === 'network-first') {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

// ========== STRATEGY: Stale While Revalidate (REKOMENDASI) ==========
// Selalu serve dari cache dulu (cepat), update cache di background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Fetch dari network untuk update cache di background
  const fetchPromise = fetch(request)
    .then(async response => {
      if (response && response.status === 200) {
        // Check apakah cache sudah expired
        const cacheExpired = await isCacheExpired(request);
        if (cacheExpired) {
          console.log('🔄 Updating cache for:', request.url);
          cache.put(request, response.clone());
        }
      }
      return response;
    })
    .catch(error => {
      console.log('⚠️ Network failed for:', request.url);
      return null;
    });

  // Return cache immediately (fast), atau tunggu network jika tidak ada cache
  return cachedResponse || fetchPromise || caches.match(OFFLINE_URL);
}

// ========== STRATEGY: Network First ==========
// Coba network dulu, fallback ke cache jika gagal
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    return new Response('Offline', { status: 503 });
  }
}

// ========== STRATEGY: Cache First ==========
// Coba cache dulu, fallback ke network jika tidak ada
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    return new Response('Offline', { status: 503 });
  }
}

// ========== HELPER FUNCTIONS ==========

// Check apakah URL perlu di-skip
function shouldSkipCache(url) {
  return EXCLUDED_URLS.some(excluded => url.href.includes(excluded));
}

// Check apakah URL adalah CDN resource
function isCDNResource(url) {
  const cdnDomains = [
    'blogger.com',
    'blogspot.com',
    'stackpath.bootstrapcdn.com',
    'code.jquery.com',
    'unpkg.com',
    'cdnjs.cloudflare.com',
    'jsdelivr.net',
    'gstatic.com'
  ];
  return cdnDomains.some(domain => url.includes(domain));
}

// Check apakah cache sudah expired
async function isCacheExpired(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (!cachedResponse) {
    return true; // Tidak ada cache, perlu fetch
  }

  const cachedDate = cachedResponse.headers.get('date');
  if (!cachedDate) {
    return true; // Tidak ada tanggal, perlu update
  }

  const cacheTime = new Date(cachedDate).getTime();
  const now = Date.now();
  const age = now - cacheTime;

  return age > MAX_CACHE_AGE; // Return true jika sudah expired
}

// ========== AUTO UPDATE SERVICE WORKER ==========
// Check for updates setiap 1 jam
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notifikasi user jika ada update
self.addEventListener('controllerchange', () => {
  console.log('🔄 Service Worker: New version available!');
});

// ========== BACKGROUND SYNC (OPTIONAL) ==========
self.addEventListener('sync', event => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

function syncCart() {
  console.log('🔄 Background sync: Syncing cart...');
  // Implementasi sinkronisasi keranjang belanja
  return Promise.resolve();
}

// ========== PUSH NOTIFICATION (OPTIONAL) ==========
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Notifikasi baru dari Toko Online',
    icon: 'icon-192x192.png',
    badge: 'icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Toko Online', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// ========== PERIODIC BACKGROUND SYNC (OPTIONAL) ==========
// Auto update cache di background (butuh permission)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCache());
  }
});

async function updateCache() {
  console.log('🔄 Periodic sync: Updating cache...');
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  return Promise.all(
    requests.map(async request => {
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          await cache.put(request, response);
        }
      } catch (error) {
        console.log('⚠️ Failed to update:', request.url);
      }
    })
  );
}
console.log('🚀 Service Worker loaded with strategy:', CACHE_STRATEGY);
