// Service Worker for Browser Web Push Notifications - MakeMyTour
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Flight Radar Alert',
    body: 'Live flight tracking update received.',
    icon: '/favicon.ico',
    tag: 'flight-alert-' + Date.now(),
    data: { url: '/flight-status' }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data.title = parsed.title || data.title;
      data.body = parsed.body || parsed.desc || parsed.message || data.body;
      data.icon = parsed.icon || data.icon;
      if (parsed.data) data.data = parsed.data;
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: 'open_tracker', title: 'Open Radar Tracker' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/flight-status';

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
