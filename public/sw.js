// Retirement worker for previously installed Ocean Stride PWAs.
// Intentionally no fetch handler, cache writes, offline queue replay, or IndexedDB access.
// Claim existing pages so their next navigation reaches the network, then unregister.
// Do not force-reload pages or remove old offline data before an operator exports it.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await self.registration.unregister();
    })(),
  );
});
