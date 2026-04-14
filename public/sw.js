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
