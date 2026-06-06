import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Push helper functions (MOVED OUTSIDE BLOCK) ──
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function subscribeToPush(reg: ServiceWorkerRegistration) {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) return;

    const { key } = await res.json();
    if (!key) return;

    const existing = await reg.pushManager.getSubscription();
    if (existing) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    console.log("✅ Push subscription saved");
  } catch (err) {
    console.warn("Push subscription failed:", err);
  }
}

// ── Inline Service Worker (works on Vercel static hosting) ──
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const SW_CODE = `
const CACHE_NAME = "hajdeha-v3";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.protocol === "chrome-extension:") return;

  // Never intercept API calls — let the browser handle them natively
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.destination === "image") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return new Response("", { status: 404 });
        }
      })
    );
    return;
  }

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
        caches.match(request).then((cached) => cached || caches.match("/"))
      )
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = JSON.parse(event.data.text());
    event.waitUntil(
      self.registration.showNotification(data.title || "HAJDE HA", {
        body: data.body || "",
        icon: data.icon || "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: data.url || "/" },
      })
    );
  } catch {}
});

// ── Local dessert notification scheduling ─────────────────────────────────────
let _dessertTimer = null;

self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  if (type === "SCHEDULE_DESSERT") {
    if (_dessertTimer !== null) { clearTimeout(_dessertTimer); _dessertTimer = null; }
    const { delay, restaurantName, tableUrl, items, hasDesserts, lang } = payload;
    _dessertTimer = setTimeout(() => {
      _dessertTimer = null;
      let title, body, tag;
      if (hasDesserts && items && items.length > 0) {
        if (lang === "mk") {
          title = restaurantName + " — Десерт? 🍰";
          body = "Може ли да ви предложиме нешто слатко?\\nПрепорачуваме: " + items.join(" и ") + ".";
        } else if (lang === "en") {
          title = restaurantName + " — Dessert? 🍰";
          body = "May we tempt you with something sweet?\\nWe recommend: " + items.join(" and ") + ".";
        } else {
          title = restaurantName + " — Ëmbëlsirë? 🍰";
          body = "A mund t'ju ofrojmë diçka të ëmbël?\\nRekomandojmë: " + items.join(" dhe ") + ".";
        }
        tag = "dessert-upsell";
      } else {
        if (lang === "mk") {
          title = restaurantName + " 🌟";
          body = "Се надеваме дека уживате! Имате ли потреба од нешто повеќе?";
        } else if (lang === "en") {
          title = restaurantName + " 🌟";
          body = "We hope you're enjoying your meal! Is there anything else we can get you?";
        } else {
          title = restaurantName + " 🌟";
          body = "Shpresojmë po kënaqeni! A keni nevojë për diçka tjetër?";
        }
        tag = "checkin-upsell";
      }
      const actions = hasDesserts
        ? [
            { action: "see-desserts", title: lang === "mk" ? "Прикажи десерти" : lang === "en" ? "Show Desserts" : "Shiko ëmbëlsirat" },
            { action: "dismiss",      title: lang === "mk" ? "Не, фала"       : lang === "en" ? "No thanks"      : "Jo, faleminderit" }
          ]
        : [
            { action: "open",    title: lang === "mk" ? "Отвори мени" : lang === "en" ? "Open menu"  : "Hap menunë" },
            { action: "dismiss", title: lang === "mk" ? "Добро е"     : lang === "en" ? "We're good" : "Jemi mirë" }
          ];
      self.registration.showNotification(title, {
        body, tag, icon: "/icon-192.png", badge: "/icon-192.png",
        data: { tableUrl, hasDesserts }, actions, requireInteraction: false,
      });
    }, delay);
  }

  if (type === "CANCEL_DESSERT") {
    if (_dessertTimer !== null) { clearTimeout(_dessertTimer); _dessertTimer = null; }
  }
});

self.addEventListener("notificationclick", (event) => {
  const { action, notification } = event;
  const { tableUrl, hasDesserts } = notification.data || {};
  notification.close();
  if (action === "dismiss") return;
  const navigateTo = tableUrl || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url === navigateTo || c.url.startsWith(navigateTo));
      if (existing) {
        existing.focus();
        if (action === "see-desserts") existing.postMessage({ type: "SHOW_DESSERTS" });
        return;
      }
      return clients.openWindow(navigateTo).then((newClient) => {
        if (newClient && action === "see-desserts") {
          setTimeout(() => newClient.postMessage({ type: "SHOW_DESSERTS" }), 2000);
        }
      });
    })
  );
});
`;

  window.addEventListener("load", () => {
    try {
      const blob = new Blob([SW_CODE], { type: "application/javascript" });
      const swUrl = URL.createObjectURL(blob);

      navigator.serviceWorker
        .register(swUrl, { scope: "/" })
        .then((reg) => {
          console.log("✅ PWA ServiceWorker registered");

          setInterval(() => reg.update(), 60000);

          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                window.location.reload();
              }
            });
          });

          subscribeToPush(reg);
        })
        .catch((err) => {
          console.warn("Blob SW failed, trying file SW:", err);

          navigator.serviceWorker
            .register("/service-worker.js")
            .then(() => console.log("✅ File SW registered"))
            .catch(() => console.log("SW not available"));
        });
    } catch (err) {
      console.log("SW not supported");
    }
  });
}

// ── Root ──
function Root() {
  return <App />;
}

createRoot(document.getElementById("root")!).render(<Root />);
