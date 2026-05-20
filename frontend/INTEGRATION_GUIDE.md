# Integration Guide - Phantom Portal Components

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Backend API running on `http://localhost:8000` (or configured origin)

### Installation

1. **Install dependencies** (if not already done):
```bash
cd /home/jolly/Projects/phantom/frontend
npm install
```

2. **Start development server**:
```bash
npm run dev
```

3. **Build for production**:
```bash
npm run build
```

## Using the Components

### Option 1: Using in Your Main App

```typescript
// src/App.tsx
import React, { useState } from 'react';
import { SecurityPanel } from './panels/SecurityPanel';
import { HomePanel } from './panels/HomePanel';
import { NotesPanel } from './panels/NotesPanel';
import ErrorBoundary from './components/ErrorBoundary';

export function App() {
  const [activePanel, setActivePanel] = useState<'home' | 'security' | 'notes'>('home');

  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-gray-900 text-white">
        {/* Sidebar Navigation */}
        <nav className="w-20 border-r border-gray-700 bg-gray-800 flex flex-col items-center py-4 gap-4">
          <NavButton
            icon="home"
            label="Home"
            active={activePanel === 'home'}
            onClick={() => setActivePanel('home')}
          />
          <NavButton
            icon="security"
            label="Security"
            active={activePanel === 'security'}
            onClick={() => setActivePanel('security')}
          />
          <NavButton
            icon="notes"
            label="Notes"
            active={activePanel === 'notes'}
            onClick={() => setActivePanel('notes')}
          />
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          {activePanel === 'home' && <HomePanel />}
          {activePanel === 'security' && <SecurityPanel />}
          {activePanel === 'notes' && <NotesPanel />}
        </main>
      </div>
    </ErrorBoundary>
  );
}

function NavButton({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-14 h-14 rounded-lg flex items-center justify-center transition ${
        active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
      }`}
      title={label}
    >
      {icon}
    </button>
  );
}
```

### Option 2: Individual Component Import

```typescript
import { SecurityPanel } from './panels/SecurityPanel';

export function SecurityView() {
  return <SecurityPanel />;
}
```

## State Management

### Accessing Zustand Stores

```typescript
import { useSecurityStore } from './stores/security';
import { useHomeAssistantStore } from './stores/homeassistant';
import { useNotesStore } from './stores/notes';

// In your component
export function MyComponent() {
  const { events, cameras } = useSecurityStore();
  const { devices } = useHomeAssistantStore();
  const { notes, activeNoteId } = useNotesStore();

  return (
    // Use state...
  );
}
```

### Updating Store State

```typescript
// Direct store actions
const { createNote, saveNote, removeNote } = useNotesStore();

await createNote('My Note', 'Content...');
await saveNote(noteId, { title: 'Updated' });
await removeNote(noteId);
```

## API Integration

### Using the Centralized Client

```typescript
import { api } from './api/client';

// Security API
const cameras = await api.security.getCameras();
const snapshot = await api.security.getSnapshot(cameraId);
const events = await api.security.getEvents(50, 0);
await api.security.armSystem('default', true);

// Home Assistant API
const devices = await api.homeassistant.getDevices();
await api.homeassistant.controlLight(entityId, true, 200);
await api.homeassistant.controlSwitch(entityId, false);
await api.homeassistant.activateScene(sceneId);

// Notes API
const allNotes = await api.notes.list();
const note = await api.notes.create({ title: 'New', content: '' });
await api.notes.update(noteId, { title: 'Updated' });
await api.notes.delete(noteId);

// AI API
const title = await api.ai.generateTitle(noteId, content);
const keyPoints = await api.ai.generateKeyPoints(noteId, content);
```

## WebSocket Integration

### Real-time Event Monitoring

```typescript
import { createSecurityWSManager } from './api/websocket';

const wsManager = createSecurityWSManager();

// Register event handlers
wsManager.on('motion_event', (event) => {
  console.log('Motion detected:', event);
});

// Connection lifecycle
wsManager.onConnect(() => console.log('Connected'));
wsManager.onDisconnect(() => console.log('Disconnected'));

// Connect
await wsManager.connect();

// Send/receive
wsManager.send({ type: 'ping' });

// Cleanup
wsManager.disconnect();
```

### Note Sync

```typescript
import { createSyncWSManager } from './api/websocket';

const syncManager = createSyncWSManager();

syncManager.on('note_create', (msg) => console.log('Note created'));
syncManager.on('note_update', (msg) => console.log('Note updated'));
syncManager.on('note_delete', (msg) => console.log('Note deleted'));

await syncManager.connect();
```

## Error Handling

### With Error Boundary

```typescript
import ErrorBoundary from './components/ErrorBoundary';

<ErrorBoundary>
  <SecurityPanel />
</ErrorBoundary>
```

### Manual Error Handling

```typescript
import { ErrorMessage } from './components/LoadingStates';

export function MyComponent() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {error && (
        <ErrorMessage
          error={error}
          onDismiss={() => setError(null)}
        />
      )}
      {/* Component content */}
    </div>
  );
}
```

## Loading States

### Using Loading Components

```typescript
import { LoadingSpinner, SkeletonLoader, EmptyState } from './components/LoadingStates';

// Spinner
<LoadingSpinner size="md" />

// Skeleton placeholder
<SkeletonLoader count={3} />

// Empty state
<EmptyState
  title="No notes yet"
  description="Create your first note to get started"
  action={{
    label: 'Create Note',
    onClick: () => createNote('Untitled', '')
  }}
/>
```

## Styling & Customization

### Tailwind CSS

All components use Tailwind CSS. Customize colors in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Custom colors here
      }
    }
  }
}
```

### Component Props

Most components accept standard React props:

```typescript
<SecurityPanel />
<HomePanel />
<NotesPanel />
```

Note: These components manage their own state via Zustand and don't accept external props.

## Environment Configuration

### API Base URL

Currently uses `window.location.origin`. To change:

Edit `src/api/client.ts`:
```typescript
const client = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || window.location.origin,
  // ...
});
```

### Development vs Production

```bash
# Development
npm run dev  # Hot reload, source maps

# Production
npm run build  # Optimized bundle
npm run preview  # Preview production build
```

## Troubleshooting

### WebSocket Connection Fails
- Ensure backend is running
- Check WebSocket endpoint paths: `/ws/security`, `/ws/sync`
- Verify CORS if on different origin
- Check browser console for errors

### API Calls Return 404
- Verify backend API routes are registered
- Check base URL in `api/client.ts`
- Ensure endpoints match backend routers

### State Not Updating
- Check Zustand store is imported correctly
- Verify action function is called
- Use React DevTools to inspect store
- Check for async operations completing

### WebSocket Auto-reconnect Not Working
- Check max reconnect attempts (default: 5)
- Verify exponential backoff timing
- Monitor browser console for error details

## Performance Optimization

### Production Checklist

1. **Build optimization**:
```bash
npm run type-check  # Verify TypeScript
npm run build       # Production bundle
```

2. **Code splitting** (Vite handles this automatically)

3. **Bundle size monitoring**:
```bash
npm run build -- --analyze  # If analyzer is configured
```

4. **Network optimization**:
- WebSocket for real-time instead of polling
- Auto-save debouncing (1s delay)
- Selective state updates

## Testing

### Unit Tests (with Jest/RTL)

```typescript
import { renderHook, act } from '@testing-library/react';
import { useSecurityStore } from './stores/security';

test('addEvent updates events list', () => {
  const { result } = renderHook(() => useSecurityStore());

  act(() => {
    result.current.addEvent({
      id: '1',
      timestamp: new Date().toISOString(),
      camera_id: 'cam1',
      confidence: 0.9,
      created_at: new Date().toISOString(),
    });
  });

  expect(result.current.events).toHaveLength(1);
});
```

### Integration Tests

```typescript
import { render, screen } from '@testing-library/react';
import { SecurityPanel } from './panels/SecurityPanel';

test('renders security panel', () => {
  render(<SecurityPanel />);
  expect(screen.getByText(/Security/i)).toBeInTheDocument();
});
```

## Deployment

### To Production

1. **Build**:
```bash
npm run build
```

2. **Output**: `dist/` directory

3. **Deploy** to static hosting:
```bash
# Using Docker (see Dockerfile)
docker build -f frontend/Dockerfile -t phantom-frontend .
```

4. **Environment**:
- Ensure backend API is accessible
- HTTPS required for WebSocket (wss://)
- CORS headers configured on backend

### Docker Build

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

## Monitoring

### Browser Console
- WebSocket connection logs
- API errors and warnings
- Component errors caught by ErrorBoundary

### Backend Logs
- API request/response logs
- WebSocket connection events
- Database query logs

## Next Steps

1. Integrate with your main app layout
2. Configure backend API endpoints
3. Set up error tracking (Sentry, etc.)
4. Add analytics tracking
5. Set up CI/CD pipeline
6. Configure PWA manifest
7. Add additional features/customizations

## Support

For issues or questions:
1. Check browser console for errors
2. Review component source code
3. Check backend API implementation
4. Verify network requests in DevTools
5. Review type definitions for correct usage

## Version History

- v0.1.0 - Initial release with 3 main panels
  - SecurityPanel with live camera feeds
  - HomePanel with smart home control
  - NotesPanel with AI integration
  - Full Zustand state management
  - WebSocket real-time sync
  - Production-ready error handling
