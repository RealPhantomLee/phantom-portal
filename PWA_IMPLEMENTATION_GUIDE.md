# PWA Service Worker and Push Notifications Implementation Guide

## Overview

This guide covers the PWA (Progressive Web App) implementation for Phantom Portal, including:
1. Service Worker for offline support and caching
2. Web Push Notifications system
3. Install prompt handling
4. Backend API integration

All files have been created and configured. This guide explains how to use and extend the system.

## Files Created

### Frontend (TypeScript/React)

#### Service Worker
- **Location**: `frontend/public/sw.ts`
- **Compiled to**: `frontend/dist/sw.js` (at build time)
- **Purpose**: Handles caching, push events, background sync, offline support

#### PWA Utilities
- **Location**: `frontend/src/pwa/`
- Files:
  - `push.ts` - Web push subscription management
  - `install.ts` - Install prompt handling
  - `usePWA.ts` - React hook for PWA features
  - `README.md` - Detailed documentation

#### Configuration
- **Vite Config**: `frontend/vite.config.ts`
  - Configured with `vite-plugin-pwa`
  - Service worker strategy: `injectManifest` (uses custom sw.ts)
  - Minimal precaching (only index.html)
- **Manifest**: `frontend/public/manifest.json`
  - PWA metadata, icons, shortcuts, share target
- **HTML**: `frontend/index.html`
  - Meta tags for PWA support
  - Manifest link
- **Entry Point**: `frontend/src/index.tsx`
  - Initializes service worker
  - Initializes PWA features

### Backend (Python/FastAPI)

#### Push Notification Router
- **Location**: `backend/routers/push.py`
- **Endpoints**:
  - `GET /api/push/vapid-public-key` - Get encryption public key
  - `POST /api/push/subscribe` - Register subscription
  - `POST /api/push/unsubscribe` - Unregister subscription
  - `POST /api/push/test` - Send test notification
  - `GET /api/push/subscriptions/count` - Get subscription stats

#### Configuration
- **Config File**: `backend/config.py`
  - `WebPushConfig` class with VAPID keys
  - Integrated into main settings
- **Main App**: `backend/main.py`
  - Push router registered
  - Ready for motion event notifications

## Quick Start

### 1. Frontend Setup (Already Done)

No additional setup needed! The frontend is ready to use.

```typescript
// In React components, use the hook:
import { usePWA } from './pwa/usePWA';

function SettingsPanel() {
  const [state, actions] = usePWA();
  
  return (
    <>
      {state.canInstall && (
        <button onClick={() => actions.showInstallPrompt()}>
          Install App
        </button>
      )}
      {state.notificationsSupported && (
        <button onClick={() => actions.subscribeToPushNotifications()}>
          Enable Notifications
        </button>
      )}
    </>
  );
}
```

### 2. Backend Configuration

#### A. Generate VAPID Keys (One-Time Setup)

```bash
# Install web-push
pip install web-push

# Generate keys in Python
python3 << 'EOF'
from web_push import generate_vapid_keys

keys = generate_vapid_keys()
print("Public Key:", keys['public'])
print("Private Key:", keys['private'])
EOF
```

#### B. Update Configuration File

Edit `phantom.config.yaml` (or create from example):

```yaml
web_push:
  vapid_private_key: "YOUR_PRIVATE_KEY_HERE"
  vapid_public_key: "YOUR_PUBLIC_KEY_HERE"
  vapid_email: "admin@example.com"  # Your email for push service

# ... rest of config
```

#### C. Install Dependencies

```bash
cd backend
pip install web-push
```

### 3. Enable Push Notifications

Once VAPID keys are configured, the system is ready:

1. User opens app → gets prompted for notification permission
2. User clicks "Enable Notifications" → browser gets subscription
3. Subscription sent to backend `/api/push/subscribe`
4. Backend stores subscription in memory (or database in production)
5. Server can now send push notifications to that subscription

## Integration Points

### Motion Detection Notifications

When a motion event occurs (via MQTT), you can send a push notification:

```python
# In backend/main.py or your motion event handler

from routers.push import send_motion_notification

# After receiving motion event from MQTT
motion_event = {
    "camera": "front-door",
    "timestamp": "2026-05-16T10:30:00Z",
    "confidence": 0.95,
    "thumbnail_url": "/api/security/snapshot/front-door",
    "narration": "Person detected at front door with 95% confidence",
}

await send_motion_notification(motion_event, settings)
```

### WebSocket Real-Time Updates

The service worker can work alongside WebSocket connections for real-time updates:

```typescript
// WebSocket for real-time (when app is open)
const ws = new WebSocket('wss://cyberdeck.tail3ab12c.ts.net/ws/security');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time motion event
};

// Push notifications (when app is closed or backgrounded)
// Handled automatically by service worker
```

### Background Sync for Offline Notes

When a user creates/edits a note while offline:

```typescript
// Store in IndexedDB
if (!navigator.onLine) {
  const db = await openIDB();
  await db.put('pending_notes', {
    id: generateId(),
    title: "My Note",
    content: "...",
  });

  // Register sync
  const registration = await navigator.serviceWorker.ready;
  await (registration as any).sync.register('sync-notes');
}

// Service worker automatically syncs when back online
// See frontend/public/sw.ts for implementation
```

## Caching Strategy

### Cache-First (Assets)
- Files: `.js`, `.css`, `.html`, `.png`, `.svg`, `.ico`, `.woff`, `.woff2`
- Served from cache first
- Updated from network in background
- Perfect for: Static assets, stylesheets

### Network-First (API)
- Paths: `/api/*`
- Tried from network first
- Falls back to cache
- Returns offline error if neither available
- Perfect for: API calls, dynamic content

### No Cache (WebSocket)
- `ws://`, `wss://` connections
- Never cached
- Real-time only

## Development Workflow

### Testing Service Worker

1. **Enable in development**:
   ```bash
   cd frontend
   npm run dev
   # Service worker auto-registers on localhost
   ```

2. **View in DevTools**:
   - Open DevTools > Application > Service Workers
   - Click "Inspect" to debug

3. **Test notifications**:
   ```typescript
   import { subscribeToNotifications, testPushNotification } from './pwa/push';
   
   await subscribeToNotifications();
   await testPushNotification();
   ```

4. **Clear cache**:
   ```typescript
   // In DevTools Console:
   const reg = await navigator.serviceWorker.getRegistration();
   const caches_list = await caches.keys();
   for (const name of caches_list) {
     await caches.delete(name);
   }
   ```

### Debugging

**Service Worker issues**:
- Check DevTools > Application > Service Workers
- Look for errors in DevTools > Console
- Check "Update on reload" for development

**Push notifications**:
- Check notification permission: `Notification.permission`
- Test endpoint: `await push.testPushNotification()`
- Monitor in DevTools > Application > Manifest

**Caching**:
- View cached responses: DevTools > Application > Cache Storage
- Check what was cached: Click cache name and view entries
- Invalidate: Update cache version in sw.ts (`CACHE_ASSETS_v1` → `CACHE_ASSETS_v2`)

## Production Checklist

- [ ] VAPID keys generated and stored securely
- [ ] `web_push` library installed in backend
- [ ] Push notification endpoints fully implemented
- [ ] Icons and screenshots created for PWA manifest
- [ ] Service worker testing completed
- [ ] Notification permission UX designed
- [ ] Error handling tested (offline, expired subscriptions, etc.)
- [ ] HTTPS enabled for push notifications
- [ ] Subscription database setup (migrate from in-memory storage)
- [ ] Motion event notifications integrated
- [ ] App shell caching strategy optimized

## Performance Notes

1. **Service Worker Size**: Keep sw.ts under 100KB
2. **Cache Limits**: Mobile browsers limit cache to ~50MB
3. **Precaching**: Only cache essential files (index.html)
4. **Update Strategy**: Users get new SW on page reload
5. **Subscription Storage**: In production, use a database instead of in-memory

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ (11.1+) | ✅ |
| Push Notifications | ✅ | ✅ | ❌ | ✅ |
| Install Prompt | ✅ | ❌ | ❌ | ✅ |
| Background Sync | ✅ | ✅ | ❌ | ✅ |

## Troubleshooting

### Service Worker not registering
- Ensure HTTPS (or localhost for dev)
- Check MIME type is `application/javascript`
- Look for errors in DevTools console

### Push notifications not showing
- Check notification permission: `Notification.permission === 'granted'`
- Verify VAPID keys in config
- Check server logs for push failures
- Test with: `await push.testPushNotification()`

### Caching not working
- Clear browser cache: DevTools > Application > Clear site data
- Check cache strategy: network-first for `/api`, cache-first for assets
- Update cache version to invalidate

### App not installing
- Check manifest is valid: DevTools > Application > Manifest
- Ensure HTTPS or localhost
- Check icons are accessible
- Add to home screen manually on iOS

## Further Reading

- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Google Web.dev - Progressive Web Apps](https://web.dev/progressive-web-apps/)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8291)
- [Vite PWA Plugin Docs](https://vite-pwa-org.netlify.app/)

## File Reference

```
frontend/
├── public/
│   ├── manifest.json          # PWA metadata
│   ├── sw.ts                  # Service worker (TypeScript)
│   ├── icon-*.png            # App icons
│   └── screenshot-*.png      # Store screenshots
├── src/
│   ├── index.tsx             # PWA initialization
│   ├── pwa/
│   │   ├── push.ts           # Push notification API
│   │   ├── install.ts        # Install prompt handling
│   │   ├── usePWA.ts         # React hook
│   │   └── README.md         # PWA documentation
│   └── ...
├── vite.config.ts            # Vite PWA plugin config
├── index.html               # PWA meta tags
└── package.json             # Dependencies

backend/
├── routers/
│   ├── push.py              # Push notification endpoints
│   └── ...
├── main.py                  # Register push router
├── config.py                # VAPID key config
├── phantom.config.yaml      # App configuration
└── requirements.txt         # Dependencies
```

## Next Steps

1. **Generate VAPID keys** (if not done)
2. **Update configuration** with VAPID keys
3. **Build frontend**: `npm run build`
4. **Test push notifications** in development
5. **Integrate with motion detection** (MQTT events)
6. **Set up subscription database** for production
7. **Deploy to HTTPS** (required for push)
