# PWA Quick Reference Card

## Files at a Glance

| File | Purpose | Key Functions |
|------|---------|---|
| `frontend/public/sw.ts` | Service Worker | Caching, push events, background sync |
| `frontend/src/pwa/push.ts` | Push Notifications | Subscribe, unsubscribe, test |
| `frontend/src/pwa/install.ts` | Install Prompt | Install detection, lifecycle |
| `frontend/src/pwa/usePWA.ts` | React Hook | [state, actions] for components |
| `frontend/src/pwa/types.ts` | TypeScript Types | All type definitions |
| `backend/routers/push.py` | Backend API | /api/push/* endpoints |
| `frontend/vite.config.ts` | Build Config | PWA plugin setup |

## Quick API Examples

### Push Notifications
```typescript
import { usePWA } from './pwa/usePWA';

const [state, actions] = usePWA();

// Subscribe
await actions.subscribeToPushNotifications();

// Unsubscribe
await actions.unsubscribeFromPushNotifications();

// Test
await actions.testPushNotification();

// Check status
if (state.isSubscribed) {
  console.log('Subscribed to notifications');
}
```

### Install Prompt
```typescript
const [state, actions] = usePWA();

// Show install dialog
if (state.canInstall) {
  const result = await actions.showInstallPrompt();
  // result: 'accepted' | 'dismissed'
}

// Check if installed
if (state.isInstalled) {
  console.log('App is installed');
}
```

### Direct Push API
```typescript
import * as push from './pwa/push';

// Check support
if (push.isPushSupported()) {
  // Request permission
  const perm = await push.requestPermission();
  
  // Subscribe
  const sub = await push.subscribeToNotifications();
  
  // Check status
  const isSubscribed = await push.isSubscribed();
  
  // Unsubscribe
  await push.unsubscribeFromNotifications();
}
```

### Direct Install API
```typescript
import * as install from './pwa/install';

// Initialize on app load
install.initializeInstallPrompt();
install.setupAppLifecycleListeners();

// Show prompt
if (install.canInstall()) {
  const result = await install.showInstallPrompt();
}

// Check status
const info = install.getInstallInfo();
// { canInstall, isInstalled, displayMode }

// Subscribe to changes
const unsubscribe = install.onInstallPromptChange((available) => {
  console.log('Install prompt available:', available);
});
```

## Backend API Endpoints

```
GET /api/push/vapid-public-key
→ { "publicKey": "base64-string" }

POST /api/push/subscribe
← { "endpoint": "...", "keys": {...} }
→ { "status": "ok", "message": "..." }

POST /api/push/unsubscribe
← { "endpoint": "..." }
→ { "status": "ok", "message": "..." }

POST /api/push/test
→ { "status": "ok", "message": "..." }

GET /api/push/subscriptions/count
→ { "total_subscriptions": 42, "users": 10 }
```

## Configuration

### Required (phantom.config.yaml)
```yaml
web_push:
  vapid_private_key: "generated-key-here"
  vapid_public_key: "generated-key-here"
  vapid_email: "admin@example.com"
```

### Generate VAPID Keys
```bash
pip install web-push
python3 << 'EOF'
from web_push import generate_vapid_keys
keys = generate_vapid_keys()
print(f"Private: {keys['private']}")
print(f"Public: {keys['public']}")
EOF
```

## Notification Payload Format

```typescript
{
  title: "Motion Detected",
  options: {
    body: "Movement at front door",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "motion-camera-1",
    requireInteraction: true,
    data: {
      url: "/security?camera=1",
      cameraId: "camera-1",
      timestamp: 1234567890,
      thumbnail: "https://...",
      narration: "Person detected with 95% confidence"
    }
  }
}
```

## Caching Strategy

| Type | Pattern | Strategy | Behavior |
|------|---------|----------|----------|
| Assets | `.js`, `.css`, `.png`, etc | Cache-first | Serve cached, update in background |
| API | `/api/*` | Network-first | Try network, fall back to cache |
| WebSocket | `ws://`, `wss://` | No cache | Always real-time |

## Browser Support Quick Check

```javascript
// Service Worker
if ('serviceWorker' in navigator) { /* ✅ All modern browsers */ }

// Push Notifications
if ('PushManager' in window) { /* ✅ All except Safari */ }

// Install Prompt
// ✅ Chrome, Edge | ❌ Firefox, Safari

// Background Sync
if ('SyncManager' in window) { /* ✅ Chrome, Firefox, Edge | ❌ Safari */ }
```

## Debugging

### Check Service Worker Status
```javascript
// DevTools Console
const reg = await navigator.serviceWorker.getRegistration();
console.log(reg?.active?.state); // 'activated', 'installing', etc
```

### Check Notification Permission
```javascript
console.log(Notification.permission);
// 'granted', 'denied', 'default'
```

### Check Subscription
```javascript
const reg = await navigator.serviceWorker.getRegistration();
const sub = await reg?.pushManager.getSubscription();
console.log(sub?.endpoint);
```

### Clear All Caches
```javascript
const names = await caches.keys();
await Promise.all(names.map(name => caches.delete(name)));
```

### Send Message to Service Worker
```javascript
const reg = await navigator.serviceWorker.getRegistration();
reg?.controller?.postMessage({ 
  type: 'SKIP_WAITING' 
});
```

## Common Tasks

### Enable Notifications in UI
```typescript
const [state, actions] = usePWA();

return (
  <button 
    onClick={actions.subscribeToPushNotifications}
    disabled={!state.notificationsSupported || state.isSubscribing}
  >
    {state.isSubscribed ? 'Disable' : 'Enable'} Notifications
  </button>
);
```

### Show Install Button
```typescript
const [state, actions] = usePWA();

return (
  <>
    {state.canInstall && (
      <button onClick={actions.showInstallPrompt}>
        Install App
      </button>
    )}
    {state.isInstalled && (
      <span>App installed!</span>
    )}
  </>
);
```

### Send Push from Backend
```python
from routers.push import send_motion_notification

motion_event = {
    "camera": "front-door",
    "timestamp": "2026-05-16T10:30:00Z",
    "confidence": 0.95,
    "thumbnail_url": "/api/security/snapshot/...",
    "narration": "Person detected at front door"
}

await send_motion_notification(motion_event, settings)
```

### Handle Service Worker Updates
```typescript
// In index.tsx
navigator.serviceWorker.getRegistration().then(reg => {
  reg?.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW available - show "Update App" notification
          console.log('App update available');
        }
      });
    }
  });
});
```

## Performance Notes

- Service Worker: ~8KB minified
- Cache limit: ~50MB (most browsers)
- Notification click: Opens app window if not open
- Push: Works when app is closed
- Sync: Retries failed syncs automatically

## Troubleshooting Checklist

- [ ] Service Worker: Check DevTools > Application > Service Workers
- [ ] Push: Verify Notification.permission === 'granted'
- [ ] Config: VAPID keys in phantom.config.yaml
- [ ] Build: Run `npm run build` in frontend
- [ ] HTTPS: Push requires HTTPS (or localhost)
- [ ] Cache: Clear with DevTools > Application > Clear site data
- [ ] Logs: Check browser console and backend logs

## Links

- [Full PWA Documentation](./frontend/src/pwa/README.md)
- [Implementation Guide](./PWA_IMPLEMENTATION_GUIDE.md)
- [All Created Files](./PWA_FILES_CREATED.txt)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Web Dev PWA Guide](https://web.dev/progressive-web-apps/)
