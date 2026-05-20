# Phantom Portal - React Panels

Production-ready React components for the Phantom unified portal, featuring real-time updates, responsive design, and comprehensive state management with Zustand.

## Components Overview

### SecurityPanel
**Location**: `src/panels/SecurityPanel.tsx`

Complete security monitoring interface with live camera feeds and motion event tracking.

**Features**:
- Arm/Disarm toggle for Blink security system
- Left sidebar camera selector with status indicators
- Center: Live camera feed with auto-refresh (5s intervals)
- Bottom: Real-time motion event feed with pagination
- WebSocket integration for instant event updates (`/ws/security`)
- Confidence-based event filtering with color coding
- AI-generated narration display
- Event thumbnails
- Responsive grid layout for mobile/PWA

**State Management** (Zustand):
- `events`: SecurityEvent[] - motion event log (limited to 100)
- `cameras`: Camera[] - list of available cameras
- `selectedCamera`: string - currently viewed camera
- `armedSystems`: Map - arm/disarm state per system
- `wsConnected`: boolean - WebSocket connection status

**API Integration**:
- `GET /api/security/cameras` - List available cameras
- `GET /api/security/snapshot/{cameraId}` - Live snapshot (JPEG)
- `GET /api/security/events?limit=50` - Motion event history
- `POST /api/security/arm` - Arm/disarm system
- `WebSocket /ws/security` - Real-time motion events

### HomePanel
**Location**: `src/panels/HomePanel.tsx`

Smart home control interface for Home Assistant devices.

**Features**:
- Grid-based device organization (lights, switches, scenes)
- Light cards with:
  - On/off toggle
  - Brightness slider (0-255)
  - Real-time state display
- Switch cards with on/off toggle
- Scene cards for one-click activation
- Auto-refresh every 30 seconds
- Optimistic UI updates for better responsiveness
- Device type-based organization
- Responsive design for mobile/tablet

**State Management** (Zustand):
- `devices`: HomeAssistantDevice[] - all HA devices
- `scenes`: Scene[] - automation scenes
- `selectedDevices`: Set<string> - multi-select support
- `loading`: boolean - refresh state
- `lastUpdated`: number - timestamp of last refresh

**API Integration**:
- `GET /api/ha/devices` - List all devices with current state
- `POST /api/ha/light/{entityId}` - Control lights
  - Body: `{ state: boolean, brightness?: 0-255, color?: {r,g,b} }`
- `POST /api/ha/switch/{entityId}` - Toggle switches
- `POST /api/ha/scene/{sceneId}` - Activate scenes

### NotesPanel
**Location**: `src/panels/NotesPanel.tsx`

Rich note-taking interface with VaultKeeper integration.

**Features**:
- Three-column layout:
  - Left: Notes list with search/filter
  - Center: Rich text editor with auto-save
  - Right: Key points and metadata
- Real-time WebSocket sync (`/ws/sync`)
- AI-powered features:
  - Auto-generate titles
  - Extract key points
  - Semantic search (future)
- Export to plain text
- Full CRUD operations
- Search and filter
- Last updated timestamps
- Auto-save on content change (1s debounce)

**State Management** (Zustand):
- `notes`: Note[] - all notes
- `activeNoteId`: string | null - currently edited note
- `filter`: { search?, tags? } - active filters
- `wsConnected`: boolean - sync status

**API Integration**:
- `GET /api/notes` - List all notes
- `POST /api/notes` - Create new note
- `PUT /api/notes/{noteId}` - Update note
- `DELETE /api/notes/{noteId}` - Delete note
- `GET /api/notes/{noteId}/export` - Export as text
- `POST /api/ai/generate-title` - AI title generation
- `POST /api/ai/generate-key-points` - Key point extraction
- `WebSocket /ws/sync` - Real-time note synchronization

## Zustand Stores

### `stores/security.ts`
Manages security panel state and operations.

```typescript
interface SecurityStore {
  events: SecurityEvent[];
  cameras: Camera[];
  selectedCamera: string | null;
  armedSystems: Map<string, boolean>;
  addEvent(event): void;
  setCameras(cameras): void;
  selectCamera(cameraId): void;
  setArmed(systemId, armed): void;
  // ...
}
```

### `stores/homeassistant.ts`
Manages Home Assistant device control and state.

```typescript
interface HomeAssistantStore {
  devices: HomeAssistantDevice[];
  scenes: Scene[];
  loadDevices(): Promise<void>;
  setLightState(entityId, state, brightness?, color?): Promise<void>;
  toggleSwitch(entityId): Promise<void>;
  activateScene(sceneId): Promise<void>;
  // ...
}
```

### `stores/notes.ts`
Manages note CRUD and real-time sync.

```typescript
interface NotesStore {
  notes: Note[];
  activeNoteId: string | null;
  filter: NotesFilter;
  createNote(title, content): Promise<Note>;
  saveNote(noteId, data): Promise<void>;
  removeNote(noteId): Promise<void>;
  generateTitle(noteId, content): Promise<string>;
  generateKeyPoints(noteId, content): Promise<string[]>;
  // ...
}
```

## WebSocket Integration

### Security WebSocket (`/ws/security`)
Real-time motion event streaming.

**Message Format**:
```typescript
{
  type: 'motion_event',
  timestamp: ISO8601,
  camera: string,
  confidence: 0-1,
  thumbnail_url?: string,
  narration?: string
}
```

### Sync WebSocket (`/ws/sync`)
Real-time note synchronization.

**Message Format**:
```typescript
// Create/Update
{
  type: 'note_create' | 'note_update',
  note: { id, title, content, ... }
}

// Delete
{
  type: 'note_delete',
  note_id: string
}
```

## API Client

**Location**: `src/api/client.ts`

Centralized axios client with interceptors and convenience methods.

```typescript
import { api } from './api/client';

// Security
await api.security.getCameras();
await api.security.getSnapshot(cameraId);
await api.security.getEvents(limit, offset);
await api.security.armSystem(systemId, state);

// Home Assistant
await api.homeassistant.getDevices();
await api.homeassistant.controlLight(entityId, state, brightness, color);
await api.homeassistant.controlSwitch(entityId, state);
await api.homeassistant.activateScene(sceneId);

// Notes
await api.notes.list();
await api.notes.create(data);
await api.notes.update(noteId, data);
await api.notes.delete(noteId);
await api.notes.export(noteId);

// AI
await api.ai.generateTitle(noteId, content);
await api.ai.generateKeyPoints(noteId, content);
await api.ai.search(query);
```

## Error Handling

### ErrorBoundary Component
**Location**: `src/components/ErrorBoundary.tsx`

Catches React component errors and displays fallback UI.

```typescript
<ErrorBoundary>
  <SecurityPanel />
</ErrorBoundary>
```

### Error Display Components
**Location**: `src/components/LoadingStates.tsx`

- `ErrorMessage` - Display error alerts
- `LoadingSpinner` - Show loading states
- `EmptyState` - Display empty screens with actions
- `SkeletonLoader` - Placeholder loading UI

## Responsive Design

All panels are fully responsive:
- **Mobile**: Single column layout, stacked components
- **Tablet**: Two-column where applicable
- **Desktop**: Full multi-pane layouts

Tailwind CSS breakpoints used:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## Performance Optimizations

1. **Auto-save with debouncing** (NotesPanel) - 1s delay
2. **WebSocket for real-time updates** - vs polling
3. **Snapshot refresh intervals** (SecurityPanel) - 5s cadence
4. **Device state polling** (HomePanel) - 30s cadence
5. **Pagination for event lists** - Limited to 100 events in memory
6. **Optimistic UI updates** - Instant visual feedback

## Type Safety

Comprehensive TypeScript interfaces in `src/types/index.ts`:
- `Note`, `SecurityEvent`, `Camera`, `HomeAssistantDevice`
- `WebSocketMessage`, `MotionEventMessage`, `SyncMessage`
- Full API response typing

## Production Checklist

- [x] Error boundaries for crash prevention
- [x] Loading states and skeletons
- [x] Error messages and user feedback
- [x] WebSocket reconnection logic with exponential backoff
- [x] Optimistic UI updates
- [x] Debouncing for auto-save
- [x] Responsive design
- [x] Full TypeScript support
- [x] Centralized state management
- [x] API client with interceptors
- [x] Real-time sync capabilities

## Usage Example

```typescript
import { SecurityPanel } from './panels/SecurityPanel';
import { HomePanel } from './panels/HomePanel';
import { NotesPanel } from './panels/NotesPanel';
import ErrorBoundary from './components/ErrorBoundary';

export function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <ErrorBoundary>
      <div className="h-screen flex">
        <nav>
          <button onClick={() => setActiveTab('home')}>Home</button>
          <button onClick={() => setActiveTab('security')}>Security</button>
          <button onClick={() => setActiveTab('notes')}>Notes</button>
        </nav>

        <div className="flex-1">
          {activeTab === 'home' && <HomePanel />}
          {activeTab === 'security' && <SecurityPanel />}
          {activeTab === 'notes' && <NotesPanel />}
        </div>
      </div>
    </ErrorBoundary>
  );
}
```

## Environment Variables

None required - all endpoints are relative to the current origin.

## Browser Support

- Modern browsers with ES2020+ support
- WebSocket support required
- Fetch API required
- LocalStorage optional (for future PWA features)

## Dependencies

- React 18.3.1
- Zustand 4.4.0
- Axios 1.6.2
- date-fns 2.30.0
- Tailwind CSS (via Vite config)

## Notes

- All timestamps in ISO8601 format
- Confidence scores from 0-1 (displayed as percentages)
- Brightness values 0-255 (converted to percentages in UI)
- WebSocket connections auto-reconnect with exponential backoff
- Auto-save debounce prevents excessive API calls
