// ─── Scheduled notification state ───────────────────────────
let scheduledContacts = [];
let scheduleTimer = null;

// ── Helpers ──────────────────────────────────────────────────
function msUntilNext6AM() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(6, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

function todayMMDD() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function contactMMDD(dateStr) {
  // dateStr is YYYY-MM-DD
  const parts = dateStr.split("-");
  return `${parts[1]}-${parts[2]}`;
}

// ── Fire notifications for any contact whose date is today ───
async function fireTodayNotifications() {
  const mmdd = todayMMDD();
  const todayContacts = scheduledContacts.filter(
    (c) => contactMMDD(c.date) === mmdd
  );

  for (const contact of todayContacts) {
    const isNameday = contact.type === "nameday";
    const title = isNameday
      ? `🌸 Happy Nameday, ${contact.name}!`
      : `🎂 Happy Birthday, ${contact.name}!`;
    const body = isNameday
      ? `Don't forget to wish ${contact.name} a happy nameday today!`
      : `Don't forget to wish ${contact.name} a happy birthday today!`;

    await self.registration.showNotification(title, {
      body,
      icon: "https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f382.png",
      badge:
        "https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f382.png",
      // tag prevents duplicate notifications for the same person on the same day
      tag: `reminder-${contact.firestoreId || contact.name}-${mmdd}`,
      renotify: false,
    });
  }

  // Notify the app that we just fired so it can update localStorage
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) =>
    client.postMessage({
      type: "NOTIFICATIONS_FIRED",
      date: new Date().toISOString().slice(0, 10),
    })
  );
}

// ── Schedule a recurring daily check at 6 AM ─────────────────
function scheduleNext6AM() {
  if (scheduleTimer) clearTimeout(scheduleTimer);
  const delay = msUntilNext6AM();
  scheduleTimer = setTimeout(async () => {
    await fireTodayNotifications();
    scheduleNext6AM(); // reschedule for tomorrow
  }, delay);
}

// ── Listen for messages from the React app ───────────────────
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SCHEDULE_NOTIFICATIONS") {
    scheduledContacts = event.data.contacts ?? [];
    scheduleNext6AM();
  }

  // App can also ask the SW to fire immediately (e.g. for testing)
  if (event.data.type === "FIRE_NOW") {
    fireTodayNotifications();
  }
});

const CACHE_NAME = "birthday-reminders-v1";
const ASSETS = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
  );
});
