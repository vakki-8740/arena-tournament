const CACHE_NAME = 'arena-tournament-v2';
const urlsToCache = [
    '/home.html',
    '/matches.html',
    '/rank.html',
    '/wallet.html',
    '/profile.html',
    '/settings.html',
    '/styles.css',
    '/common.js',
    '/auth.js',
    '/home.js',
    '/matches.js',
    '/rank.js',
    '/wallet.js',
    '/profile.js',
    '/settings.js',
    '/firebase-config.js',
    '/firestore-direct.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache).catch(() => {}))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) return caches.delete(cache);
                })
            );
        })
    );
    self.clients.claim();
});

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
                if (event.request.destination === 'document') {
                    return caches.match('/home.html');
                }
            })
    );
});
