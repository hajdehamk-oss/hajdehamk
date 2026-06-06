const CACHE_NAME = "hajdeha-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.json",
];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch — Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== "GET" || url.protocol === "chrome-extension:") return;

  // API calls — network only (always fresh data)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Images — cache first
  if (request.destination === "image") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Everything else — network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/")),
      ),
  );
});

// ── Dessert notification scheduling ──────────────────────────────────────────
// Stores the active timer so we can cancel if needed
let dessertTimerId = null;

self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  if (type === "SCHEDULE_DESSERT") {
    // Cancel any existing timer first
    if (dessertTimerId !== null) {
      clearTimeout(dessertTimerId);
      dessertTimerId = null;
    }

    const {
      delay,
      restaurantName,
      tableUrl,
      items,
      hasDesserts,
      lang,
    } = payload;

    dessertTimerId = setTimeout(() => {
      dessertTimerId = null;

      let title, body, tag;

      if (hasDesserts && items && items.length > 0) {
        if (lang === "mk") {
          title = `${restaurantName} — Десерт? 🍰`;
          body = `Може ли да ви предложиме нешто слатко?\nПрепорачуваме: ${items.join(" и ")}.`;
        } else if (lang === "en") {
          title = `${restaurantName} — Dessert? 🍰`;
          body = `May we tempt you with something sweet?\nWe recommend: ${items.join(" and ")}.`;
        } else {
          title = `${restaurantName} — Ëmbëlsirë? 🍰`;
          body = `A mund t'ju ofrojmë diçka të ëmbël?\nRekomandojmë: ${items.join(" dhe ")}.`;
        }
        tag = "dessert-upsell";
      } else {
        if (lang === "mk") {
          title = `${restaurantName} 🌟`;
          body = "Се надеваме дека уживате! Имате ли потреба од нешто повеќе?";
        } else if (lang === "en") {
          title = `${restaurantName} 🌟`;
          body = "We hope you're enjoying your meal! Is there anything else we can get you?";
        } else {
          title = `${restaurantName} 🌟`;
          body = "Shpresojmë po kënaqeni! A keni nevojë për diçka tjetër?";
        }
        tag = "checkin-upsell";
      }

      self.registration.showNotification(title, {
        body,
        tag,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { tableUrl, hasDesserts },
        actions: hasDesserts
          ? [
              {
                action: "see-desserts",
                title: lang === "mk" ? "Прикажи десерти" : lang === "en" ? "Show Desserts" : "Shiko ëmbëlsirat",
              },
              {
                action: "dismiss",
                title: lang === "mk" ? "Не, фала" : lang === "en" ? "No thanks" : "Jo, faleminderit",
              },
            ]
          : [
              {
                action: "open",
                title: lang === "mk" ? "Отвори мени" : lang === "en" ? "Open menu" : "Hap menunë",
              },
              {
                action: "dismiss",
                title: lang === "mk" ? "Добро е" : lang === "en" ? "We're good" : "Jemi mirë",
              },
            ],
        requireInteraction: false,
        silent: false,
      });
    }, delay);

    // Confirm scheduling to the client
    event.source && event.source.postMessage({ type: "DESSERT_SCHEDULED", delay });
  }

  if (type === "CANCEL_DESSERT") {
    if (dessertTimerId !== null) {
      clearTimeout(dessertTimerId);
      dessertTimerId = null;
    }
  }
});

// ── Notification click handling ───────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  const { action, notification } = event;
  const { tableUrl, hasDesserts } = notification.data || {};

  notification.close();

  if (action === "dismiss") return;

  const navigateTo = tableUrl || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Try to find an existing open tab for this restaurant table
      const existing = clients.find(
        (c) => c.url === navigateTo || c.url.startsWith(navigateTo),
      );

      if (existing) {
        existing.focus();
        if (action === "see-desserts") {
          existing.postMessage({ type: "SHOW_DESSERTS" });
        }
        return;
      }

      // Open a new tab
      return self.clients.openWindow(navigateTo).then((newClient) => {
        if (newClient && action === "see-desserts") {
          // Small delay to let the page load before messaging
          setTimeout(() => {
            newClient.postMessage({ type: "SHOW_DESSERTS" });
          }, 2000);
        }
      });
    }),
  );
});
