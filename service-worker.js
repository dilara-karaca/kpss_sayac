const CACHE_NAME = "kpss-geri-sayim-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=2.0.4",
  "./script.js?v=2.0.4",
  "./manifest.json",
  "./assets/kpss_sayac.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isHtmlRequest =
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    (isSameOrigin && (requestUrl.pathname === "/" || requestUrl.pathname.endsWith(".html")));

  // HTML her zaman önce ağdan gelsin; yoksa eski sayfa cache'te takılı kalır
  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const forRequest = networkResponse.clone();
            const forIndex = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, forRequest);
              cache.put("./index.html", forIndex);
            });
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!isSameOrigin || !networkResponse || !networkResponse.ok) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
