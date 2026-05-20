# PWA (Progressive Web App) System

This directory contains the PWA functionality for Phantom Portal, including:
- Service Worker for offline support and caching
- Web Push Notifications
- Install Prompt handling
- Background sync for offline changes

## Files Overview

### Service Worker (`../public/sw.ts`)
The service worker handles:
- **Cache Strategies**:
  - `cache-first`: Static assets (CSS, JS, images)
  - `network-first`: API calls with fallback to cache
  - Automatic cleanup of old caches on activation
- **Push Events**: Display notifications with rich content (camera thumbnails, narration)
- **Background Sync**: Sync note updates when back online
- **Message Handling**: Communicate with clients for cache management

Located in `frontend/public/sw.ts` because it must be served from the root for full scope coverage.

### Push Notifications (`push.ts`)
Provides utilities for web push notifications:

```typescript
import * as push from './pwa/push';

// Request permission
const permission = await push.requestPermission();

// Subscribe to notifications
const subscription = await push.subscribeToNotifications();

// Check subscription status
const isSubscribed = await push.isSubscribed();

// Unsubscribe
await push.unsubscribeFromNotifications();

// Send test notification
await push.testPushNotification();

// Initialize (auto-subscribes if permission granted)
await push.initializePushNotifications();
```

**API Endpoints Required**:
- `POST /api/push/subscribe` - Register subscription with backend
- `POST /api/push/unsubscribe` - Unregister subscription
- `GET /api/push/vapid-public-key` - Get VAPID public key for push encryption
- `POST /api/push/test` - Send test notification (development)

### Install Prompt (`install.ts`)
Manages the "Install App" prompt:

```typescript
import * as install from './pwa/install';

// Initialize (call at app startup)
install.initializeInstallPrompt();
install.setupAppLifecycleListeners();

// Check if install is available
if (install.canInstall()) {
  const result = await install.showInstallPrompt();
  // result: 'accepted' | 'dismissed'
}

// Check if already installed
const isInstalled = install.isInstalledPWA();

// Get installation info
const info = install.getInstallInfo();
// { canInstall, isInstalled, displayMode }

// Subscribe to install prompt changes
const unsubscribe = install.onInstallPromptChange((available) => {
  console.log('Install prompt available:', available);
});

// Get platform info
const platform = install.getPlatformInfo();
// { os, isMobile, isDesktop }
```

### React Hook (`usePWA.ts`)
Convenient hook for React components:

```typescript
import { usePWA } from './pwa/usePWA';

export function SettingsPanel() {
  const [state, actions] = usePWA();

  return (
    <div>
      {/* Install button */}
      {state.canInstall && (
        <button onClick={() => actions.showInstallPrompt()}>
          Install App
        </button>
      )}

      {/* Notifications toggle */}
      {state.notificationsSupported && (
        <button
          onClick={() =>
            state.isSubscribed
              ? actions.unsubscribeFromPushNotifications()
              : actions.subscribeToPushNotifications()
          }
          disabled={state.isSubscribing || state.isUnsubscribing}
        >
          {state.isSubscribed ? 'Disable' : 'Enable'} Notifications
        </button>
      )}

      {/* Test notification */}
      {state.isSubscribed && (
        <button onClick={() => actions.testPushNotification()}>
          Test Notification
        </button>
      )}
    </div>
  );
}
```

**State Properties**:
- `canInstall`: boolean - Install prompt available
- `isInstalled`: boolean - App is running as installed PWA
- `notificationsSupported`: boolean - Browser supports push notifications
- `notificationsEnabled`: boolean - User has granted notification permission
- `isSubscribed`: boolean - User is subscribed to push notifications
- `isSubscribing`: boolean - Subscribe operation in progress
- `isUnsubscribing`: boolean - Unsubscribe operation in progress

**Available Actions**:
- `showInstallPrompt()` - Show install dialog
- `subscribeToPushNotifications()` - Subscribe to push notifications
- `unsubscribeFromPushNotifications()` - Unsubscribe from push notifications
- `testPushNotification()` - Send test notification

## Vite Configuration

The Vite PWA plugin is configured in `vite.config.ts` with:
- **Custom Service Worker**: Uses our custom `sw.ts` instead of auto-generated workbox
- **Manifest**: PWA manifest with icons, shortcuts, and share target
- **Development Mode**: Service worker enabled in dev for testing
- **Caching Strategy**: Minimal precaching (index.html only), custom SW handles caching

## Backend Integration

### Push Notifications Setup

1. **Install `web-push` library**:
   ```bash
   pip install web-push
   ```

2. **Generate VAPID keys** (once):
   ```python
   from web_push import generate_vapid_keys
   vapid_keys = generate_vapid_keys()
   # Store vapid_keys['public'] and vapid_keys['private'] in config
   ```

3. **Implement push endpoints**:
   ```python
   # POST /api/push/subscribe
   # - Receive subscription JSON from client
   # - Store in database with user ID
   
   # POST /api/push/unsubscribe
   # - Remove subscription from database
   
   # GET /api/push/vapid-public-key
   # - Return { "publicKey": "base64-encoded-key" }
   
   # POST /api/push/test
   # - Send test push notification to user's subscription
   ```

4. **Send push notifications**:
   ```python
   from web_push import webpush, WebPushException
   
   def send_motion_notification(subscription, motion_event):
       data = {
           "title": f"Motion detected on {motion_event['camera']}",
           "options": {
               "body": motion_event.get('narration', 'Motion detected'),
               "icon": "/icon-192.png",
               "badge": "/icon-192.png",
               "tag": f"motion-{motion_event['camera']}",
               "data": {
                   "url": "/security",
                   "cameraId": motion_event['camera'],
                   "timestamp": motion_event['timestamp'],
                   "thumbnail": motion_event.get('thumbnail_url'),
                   "narration": motion_event.get('narration'),
               }
           }
       }
       
       try:
           webpush(
               subscription=subscription,
               data=json.dumps(data),
               vapid_private_key=VAPID_PRIVATE_KEY,
               vapid_claims={"sub": "mailto:admin@example.com"}
           )
       except WebPushException as e:
           # Handle expired subscriptions, etc.
           if e.response.status_code == 410:
               # Subscription expired, remove from database
               pass
   ```

## Caching Strategy

### Assets (Cache-First)
Files matching `.{js,css,html,png,svg,ico,woff,woff2}` are cached first:
1. Check cache
2. If not found, fetch from network
3. Cache successful responses
4. Serve from cache on network failure

### API Calls (Network-First)
Paths starting with `/api` use network-first:
1. Try network first
2. Cache successful responses
3. Fall back to cache on network failure
4. Return offline response if neither available

### WebSocket (No Cache)
WebSocket connections (`ws://`, `wss://`) are not cached.

## Background Sync

When offline, changes to notes are stored in IndexedDB and synced when back online:

1. User creates/updates note while offline
2. Request stored in `pending_notes` ObjectStore in IndexedDB
3. When back online, service worker background sync triggers
4. Pending notes POSTed to `/api/notes`
5. On success, removed from pending queue

To use background sync in your app:

```typescript
// Store note in IndexedDB if offline
if (!navigator.onLine) {
  const db = await openIDB();
  await db.put('pending_notes', {
    id: generateId(),
    title: note.title,
    content: note.content,
    timestamp: Date.now(),
  });
  
  // Register sync
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-notes');
  }
}
```

## Notification Payload Format

Notifications received via push events should have this format:

```json
{
  "title": "Motion Detected",
  "options": {
    "body": "Motion detected in the living room",
    "icon": "/icon-192.png",
    "badge": "/icon-192.png",
    "tag": "motion-camera-1",
    "requireInteraction": true,
    "data": {
      "url": "/security?camera=1",
      "cameraId": "camera-1",
      "timestamp": 1234567890,
      "thumbnail": "https://example.com/thumbnail.jpg",
      "narration": "Movement detected with 95% confidence"
    }
  }
}
```

When user clicks the notification, the `data.url` is opened.

## Testing

### Development
1. Service worker is auto-registered in dev mode
2. Use browser DevTools > Application > Service Workers to debug
3. Notifications require HTTPS or localhost
4. Test with `await push.testPushNotification()`

### Browser DevTools
- **Service Workers**: `Application > Service Workers`
  - Check if registered
  - Monitor resource caching
  - View fetch events
- **Push Notifications**: `Application > Manifest`
  - Verify manifest loaded
  - Check icons
- **Cache**: `Application > Cache Storage`
  - View cached assets and API responses

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ (11.1+) | ✅ |
| Push Notifications | ✅ | ✅ | ❌ | ✅ |
| Install Prompt | ✅ | ❌ | ❌ | ✅ |
| Background Sync | ✅ | ✅ | ❌ | ✅ |
| Web App Manifest | ✅ | ✅ | ✅ | ✅ |

Safari on iOS doesn't support push notifications but does support PWA installation via "Add to Home Screen".

## Troubleshooting

### Service Worker not registering
- Check browser console for errors
- Ensure `/sw.js` is being served (Vite build output)
- Must be served over HTTPS or localhost
- Check MIME type is `application/javascript`

### Push notifications not working
- Check VAPID public key is being sent correctly
- Verify `/api/push/subscribe` endpoint is working
- Check notification permission is granted
- Look at browser's push permission settings
- Test with `await push.testPushNotification()`

### Caching issues
- Clear cache in DevTools > Application > Clear site data
- Or use `self.clients.matchAll()` to send clear command to SW
- Update vite.config.ts cache version numbers to invalidate

### Service Worker stuck in "waiting" state
- Close all tabs of the app
- Reopen the app
- Or manually trigger skip waiting: message service worker with `{ type: 'SKIP_WAITING' }`

## Performance Optimization

### Tips
1. **Lazy load PWA utilities** - Don't import all PWA code for non-PWA features
2. **Selective caching** - Don't cache large media files that users might not need offline
3. **Short cache lifetimes** - Update `CACHE_ASSETS` and `CACHE_API` versions frequently
4. **Optimize manifest icons** - Use smaller images or SVGs where possible

## References

- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Google Web.dev PWA Docs](https://web.dev/progressive-web-apps/)
