self.addEventListener('push', (event) => {
  let payload = { title: 'Couple Chess', body: 'Your move', url: '/' };
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) };
  } catch {
    // A push with an unreadable body still deserves a tap.
  }
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.some((window) => window.visibilityState === 'visible')) return;
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: '/favicon.ico',
        data: { url: payload.url || '/' },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(self.clients.openWindow(url));
});
