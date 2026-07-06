/* Ulagat service worker — Web Push only (no offline caching in v1). */

self.addEventListener("install", () => {
    // Activate this SW immediately on first install instead of waiting for all
    // tabs to close.
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch (e) {
        payload = { title: "Ulagat", body: event.data ? event.data.text() : "" };
    }
    const title = payload.title || "Ulagat";
    const options = {
        body: payload.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        // Same-origin app path to open on click; default to /home.
        data: { url: typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/home" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || "/home";
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            // Focus an existing tab if one is already open, else open a new one.
            for (const client of clients) {
                if ("focus" in client) {
                    client.navigate(target);
                    return client.focus();
                }
            }
            return self.clients.openWindow(target);
        }),
    );
});
