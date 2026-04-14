self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("family-gallery-v1").then((cache) => cache.addAll(["/offline.html", "/pwa-192.svg"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== "family-gallery-v1").map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match("/offline.html"))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Family Gallery", body: event.data.text() };
  }

  const title = data.title || "Family Gallery";
  const body = data.body || "You have a new update.";
  const url = data.url || "/dashboard";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/globe.svg",
      badge: "/globe.svg",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/dashboard";
  event.waitUntil(clients.openWindow(url));
});
