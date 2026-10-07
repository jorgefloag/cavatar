// CAVATAR push service worker. Deliberately minimal: only "push" and
// "notificationclick" — no "fetch" handler and no caching (Phase 1's PWA
// install support doesn't need or want offline caching; see CLAUDE.md).
// Registered only when a visitor clicks "Activar avisos" in /inbox, never
// on page load, so visitors who never opt in are completely unaffected.

self.addEventListener("push", (event) => {
  let payload = { title: "CAVATAR", body: "Tenés un mensaje nuevo.", plate: "" }
  try {
    if (event.data) payload = event.data.json()
  } catch (error) {
    // Malformed payload — fall back to the generic text above rather than
    // throwing and dropping the notification entirely.
  }

  const plate = payload.plate || ""

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Scoped per plate: a message on one plate must not silently replace
      // a still-unread notification for a different plate on the same
      // device.
      tag: `cavatar-${plate}`,
      renotify: true,
      data: { url: `/inbox?plate=${encodeURIComponent(plate)}` },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/inbox"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("/inbox") && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    }),
  )
})
