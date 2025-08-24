// Service Worker for IT Work Log PWA
const CACHE_NAME = 'it-work-log-v1.0';
const urlsToCache = [
  '/',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Service Worker: Cache failed', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip API calls for online functionality
  if (event.request.url.includes('/api/')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          console.log('Service Worker: Found in cache', event.request.url);
          return response;
        }
        
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(err => {
            console.log('Service Worker: Fetch failed', err);
            // Return offline page or cached content
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(syncOfflineData());
  }
});

// Push notification handling
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('Service Worker: Push message received', data);
    
    const options = {
      body: data.body,
      icon: '/manifest.json',
      badge: '/manifest.json',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore', title: '查看詳情',
          icon: '/manifest.json'
        },
        {
          action: 'close', title: '關閉',
          icon: '/manifest.json'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sync offline data function
async function syncOfflineData() {
  try {
    // Get offline data from IndexedDB or localStorage
    const offlineData = await getOfflineData();
    
    if (offlineData && offlineData.length > 0) {
      for (const data of offlineData) {
        try {
          await fetch('/api/logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': data.token
            },
            body: JSON.stringify(data.log)
          });
          
          // Remove from offline storage after successful sync
          await removeOfflineData(data.id);
        } catch (error) {
          console.error('Service Worker: Failed to sync data', error);
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// Helper functions for offline data management
async function getOfflineData() {
  // Implementation depends on your offline storage strategy
  return [];
}

async function removeOfflineData(id) {
  // Implementation depends on your offline storage strategy
  console.log('Removed offline data:', id);
}