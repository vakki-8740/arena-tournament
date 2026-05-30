const CACHE_NAME = 'arena-tournament-v1';
const urlsToCache = [
    '/user/home.html',
    '/user/matches.html',
    '/user/rank.html',
    '/user/wallet.html',
    '/user/profile.html',
    '/user/settings.html',
    '/user/styles.css',
    '/user/common.js',
    '/user/auth.js',
    '/user/home.js',
    '/user/matches.js',
    '/user/rank.js',
    '/user/wallet.js',
    '/user/profile.js',
    '/user/settings.js',
    '/user/firebase-config.js',
    '/site/index.html',
    '/site/style.css',
    '/site/script.js'
];

// Install - cache files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200) return response;
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.destination === 'document') {
                    return caches.match('/user/home.html');
                }
            })
    );
});
