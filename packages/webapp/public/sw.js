/* Service Worker Bigfin. Стратегии:
 * - /api/*, не-GET, кросс-домен — не перехватываем (учёт всегда живой);
 * - навигация — network-first, офлайн → кэшированный index.html;
 * - /assets/* (хэшированные бандлы Vite) — cache-first;
 * - прочая same-origin статика — stale-while-revalidate.
 * CACHE_VERSION поднимать при изменении логики этого файла. */
const CACHE_VERSION = 'bigfin-v1';
const NAV_CACHE = `${CACHE_VERSION}-nav`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const KNOWN = [NAV_CACHE, ASSET_CACHE, STATIC_CACHE];

self.addEventListener('install', () => {
  // Активацию не форсируем: ждём SKIP_WAITING от регистратора.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !KNOWN.includes(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirstNav(request) {
  const cache = await caches.open(NAV_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put('/index.html', fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match('/index.html');
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((fresh) => {
      if (fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached || refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNav(request));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(ASSET_CACHE, request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
