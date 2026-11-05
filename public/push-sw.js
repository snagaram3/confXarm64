/* Floorwise attendee reminders. Not a sponsor or organizer worker. */
self.addEventListener("push", (event) => {
  let payload = { title: "Floorwise", body: "Upcoming session", url: "/" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    /* keep default */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
