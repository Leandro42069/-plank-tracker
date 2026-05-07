const CACHE = "plank-tracker-v1";
const ASSETS = ["./", "index.html", "styles.css", "app.js", "manifest.json", "icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

self.addEventListener("push", (event) => {
  const data = event.data?.json?.() || { title: "Zeit für deine Plank", body: "Starte jetzt deinen Timer." };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "icon.svg" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("./"));
});
