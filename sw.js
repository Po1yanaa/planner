// Сервис-воркер: сохраняет файлы приложения, чтобы планер открывался без интернета.
// Сначала берёт свежую версию из сети, без интернета — из кэша.
const CACHE = 'planner-v14';
const SHELL = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icons/check-180.png',
  'icons/check-192.png',
  'icons/check-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      } catch {
        return (await cache.match(e.request, { ignoreSearch: true })) || Response.error();
      }
    })
  );
});
