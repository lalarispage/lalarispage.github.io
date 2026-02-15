// Service Worker untuk PWA - DENGAN OPSI REAL-TIME
// Mix strategy: Real-time untuk data penting, cache untuk assets

const CACHE_VERSION = 'v1';
const CACHE_NAME = `toko-online-${CACHE_VERSION}-${self.registration.scope}`;
const OFFLINE_URL = '/offline.html';

// ========== KONFIGURASI CACHE PER TIPE KONTEN ==========

const CACHE_SETTINGS = {
  // REAL-TIME - Tidak di-cache, selalu ambil dari network
  realtime: {
    age: 0, // 0 = no cache
    strategy: 'network-only',
    patterns: [
      '/search/label/promo',      // Halaman promo (harga sering berubah)
      '/search/label/flash-sale', // Flash sale
      '/p/stock-availability',    // Stock availability
      'api.example.com/price'     // API harga real-time (jika ada)
    ]
  },
  
  // VERY FAST - Update setiap 1 menit
  veryFast: {
    age: 1 * 60 * 1000, // 1 menit
    strategy: 'stale-while-revalidate',
    patterns: [
      '/search/label/new',        // Produk baru
      '/p/best-seller'            // Best seller (sering berubah ranking)
    ]
  },
  
  // FAST - Update setiap 5-15 menit
  fast: {
    age: 5 * 60 * 1000, // 5 menit
    strategy: 'stale-while-revalidate',
    patterns: [
      '/',                        // Homepage
      '/search/label/',           // Halaman kategori
      '.html'                     // Semua halaman HTML
    ]
  },
  
  // MEDIUM - Update setiap 1 jam
  medium: {
    age: 60 * 60 * 1000, // 1 jam
    strategy: 'stale-while-revalidate',
    patterns: [
      '/p/about',                 // Halaman about
      '/p/contact',               // Halaman contact
      '/p/terms'                  // Terms & conditions
    ]
  },
  
  // STATIC - Cache lama (7 hari)
  static: {
    age: 7 * 24 * 60 * 60 * 1000, // 7 hari
    strategy: 'cache-first',
    patterns: [
      '.css',
      '.js',
      '.woff',
      '.woff2',
      '.ttf',
      'bootstrap',
      'jquery',
      'leaflet'
    ]
  },
  
  // IMAGES - Cache lama (30 hari)
  images: {
    age: 30 * 24 * 60 * 60 * 1000, // 30 hari
    strategy: 'cache-first',
    patterns: [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.svg',
      'blogspot.com',
      'bp.blogspot.com'
    ]
  }
};

// Daftar URL yang tidak perlu di-cache
const EXCLUDED_URLS = [
  '/blogger_dynamic',
  '/b/post-preview',
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'pagead',
  'adsense'
];

// ========== INSTALL SERVICE WORKER ==========
self.addEventListener('install', event => {
  console.log('✅ Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Caching offline page');
        return cache.add(OFFLINE_URL);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('❌ Install failed:', err))
  );
});

// ========== ACTIVATE SERVICE WORKER ==========
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// ========== FETCH HANDLER ==========
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip jika dalam excluded list
  if (shouldSkipCache(url.href)) {
    return;
  }

  // Skip cross-origin kecuali CDN
  if (!url.origin.includes(self.location.origin) && !isCDNResource(url.href)) {
    return;
  }

  // Tentukan setting berdasarkan URL
  const setting = getCacheSetting(url.href);
  
  // Pilih strategy berdasarkan setting
  if (setting.strategy === 'network-only') {
    event.respondWith(networkOnly(request));
  } else if (setting.strategy === 'stale-while-revalidate') {
    event.respondWith(staleWhileRevalidate(request, setting.age));
  } else if (setting.strategy === 'cache-first') {
    event.respondWith(cacheFirst(request, setting.age));
  } else {
    event.respondWith(networkFirst(request));
  }
});

// ========== STRATEGIES ==========

// Network Only - REAL-TIME (tidak di-cache)
async function networkOnly(request) {
  try {
    console.log('🔴 REAL-TIME fetch (no cache):', request.url);
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('❌ Network failed:', request.url);
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    return new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate - RECOMMENDED
async function staleWhileRevalidate(request, maxAge) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Fetch dari network untuk update cache
  const fetchPromise = fetch(request)
    .then(async response => {
      if (response && response.status === 200) {
        // Check cache age
        if (cachedResponse) {
          const cacheExpired = await checkCacheAge(cachedResponse, maxAge);
          if (cacheExpired) {
            console.log('🔄 Cache expired, updating:', request.url);
            cache.put(request, response.clone());
          }
        } else {
          // No cache, save it
          console.log('💾 Caching new:', request.url);
          cache.put(request, response.clone());
        }
      }
      return response;
    })
    .catch(error => {
      console.log('⚠️ Network failed:', request.url);
      return null;
    });

  // Return cache jika ada, atau tunggu network
  return cachedResponse || fetchPromise || caches.match(OFFLINE_URL);
}

// Cache First - Untuk assets statis
async function cacheFirst(request, maxAge) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    const expired = await checkCacheAge(cachedResponse, maxAge);
    if (!expired) {
      return cachedResponse;
    }
  }

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    return new Response('Offline', { status: 503 });
  }
}

// Network First - Fallback
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
    return cachedResponse || caches.match(OFFLINE_URL);
  }
}

// ========== HELPER FUNCTIONS ==========

// Dapatkan cache setting berdasarkan URL
function getCacheSetting(url) {
  // Check semua patterns
  for (const [key, setting] of Object.entries(CACHE_SETTINGS)) {
    for (const pattern of setting.patterns) {
      if (url.includes(pattern)) {
        console.log(`📋 Using ${key} strategy for:`, url);
        return setting;
      }
    }
  }
  
  // Default: fast
  return CACHE_SETTINGS.fast;
}

// Check apakah cache sudah expired
async function checkCacheAge(response, maxAge) {
  if (maxAge === 0) return true; // Always expired if maxAge = 0
  
  const cachedDate = response.headers.get('date');
  if (!cachedDate) return true;

  const cacheTime = new Date(cachedDate).getTime();
  const now = Date.now();
  const age = now - cacheTime;

  return age > maxAge;
}

// Check apakah URL harus di-skip
function shouldSkipCache(url) {
  return EXCLUDED_URLS.some(excluded => url.includes(excluded));
}

// Check apakah CDN resource
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

// ========== MESSAGE HANDLER ==========
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Force update cache
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    event.waitUntil(updateAllCaches());
  }
});

// Force update semua cache
async function updateAllCaches() {
  console.log('🔄 Force updating all caches...');
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  return Promise.all(
    requests.map(async request => {
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          await cache.put(request, response);
          console.log('✅ Updated:', request.url);
        }
      } catch (error) {
        console.log('⚠️ Failed to update:', request.url);
      }
    })
  );
}

// ========== PUSH NOTIFICATION ==========
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Ada update baru!',
    icon: 'icon-192x192.png',
    badge: 'icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'notification'
  };

  event.waitUntil(
    self.registration.showNotification('Toko Online', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});

console.log('🚀 Service Worker loaded with multi-strategy caching');
console.log('📊 Real-time URLs:', CACHE_SETTINGS.realtime.patterns);
console.log('⚡ Fast URLs:', CACHE_SETTINGS.fast.patterns);
console.log('💾 Cached assets:', CACHE_SETTINGS.static.patterns);
