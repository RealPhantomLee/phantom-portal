# Phantom Portal Frontend - Implementation Guide

## Quick Start

### Installation & Development
```bash
cd /home/jolly/Projects/phantom/frontend

# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Type check without emitting code
npm run type-check
```

## Files Created

### Core Application Files

#### `src/App.tsx` (12 KB)
**Main application component with complete layout system.**

Features:
- Responsive three-column desktop layout with:
  - Left sidebar (navigation, search, logo)
  - Center area (active panel content)
  - Right sidebar (quick status, device info)
- Mobile layout with:
  - Top bar (logo + hamburger menu)
  - Sliding menu for navigation
  - Bottom tab navigation bar
- Tab navigation: Home | Notes | Security
- PWA install prompt integration
- Notification permission management
- Dark theme with Tailwind CSS
- Window resize listener for responsive breakpoint (768px)

Key State:
- `isMobile`: Tracks screen size
- `menuOpen`: Mobile menu visibility
- `installPrompt`: PWA install event
- `isPWAInstalled`: App installation status

#### `src/index.tsx` (2 KB)
**Application entry point and PWA initialization.**

Responsibilities:
- Mounts React to `#root` element
- Registers service worker for PWA
- Handles service worker update lifecycle
- Initializes PWA features (install prompt, push notifications)
- Requests notification permissions on app startup
- Includes React.StrictMode for development warnings

#### `src/index.css` (1.4 KB)
**Global styles and Tailwind CSS setup.**

Includes:
- Tailwind CSS directives (base, components, utilities)
- Dark theme color scheme
- Custom scrollbar styling (webkit + Firefox)
- Input and button reset styles
- Smooth animations with prefers-reduced-motion support
- Mobile-responsive font sizing

### Type Definitions

#### `src/types/index.ts` (2.1 KB)
**TypeScript interfaces matching backend API responses.**

Interfaces:
- `Note`: Content, metadata, AI summary
- `SecurityEvent`: Camera motion with confidence, narration, thumbnails
- `Camera`: Device info and status
- `HomeAssistantDevice`: Entity state and attributes
- `Scene`: Automation scenes
- `SemanticSearchResult`: Search hits with relevance
- `ChatMessage`: User/assistant messages
- `WebSocketMessage`: Generic WebSocket event
- `MotionEventMessage`: Real-time motion event
- `AppStore`: Zustand store interface

### State Management

#### `src/stores/appStore.ts` (716 B)
**Zustand store for application state with localStorage persistence.**

State:
- `activeTab`: "home" | "notes" | "security" (persisted)
- `isInstallPromptVisible`: PWA prompt visibility
- `notificationsEnabled`: Notification permission flag (persisted)

Methods:
- `setActiveTab(tab)`: Switch active panel
- `setInstallPromptVisible(visible)`: Show/hide install prompt
- `setNotificationsEnabled(enabled)`: Update notification flag

localStorage key: `phantom-app-store`

### Panel Components

#### `src/panels/HomePanel.tsx` (3.4 KB)
**Home Assistant device control panel.**

Features:
- Fetches devices from `/api/ha/devices`
- Displays device list with on/off toggles
- Differentiates between lights and switches
- Optimistic UI updates for responsiveness
- Error handling with user messages
- Loading states
- Refresh button to manually reload devices

API Calls:
- `GET /api/ha/devices`: List all devices
- `POST /api/ha/light/{entity_id}`: Control lights
- `POST /api/ha/switch/{entity_id}`: Control switches

#### `src/panels/NotesPanel.tsx` (2.9 KB)
**Semantic note search panel.**

Features:
- Real-time semantic search as user types
- Displays search results with relevance scores (0-100%)
- Click notes to view details
- Shows query feedback ("Start typing" / "No notes found")
- Loading indicator during search
- Selected note detail view

API Calls:
- `GET /api/ai/search/semantic?query={query}`: Search notes

#### `src/panels/SecurityPanel.tsx` (3.2 KB)
**Real-time security events panel with WebSocket streaming.**

Features:
- WebSocket connection to `/ws/security` for live events
- Displays motion events with:
  - Camera ID and timestamp
  - Confidence percentage badge
  - AI narration in styled box
  - Thumbnail image preview
- Auto-reconnect on disconnect (3-second delay)
- Event history via `/api/security/events`
- Graceful cleanup on unmount
- Error handling and user feedback

API Calls:
- `WS /ws/security`: Real-time motion events
- `GET /api/security/events`: Event history (limit=50)

### Configuration Files

#### `package.json`
**Project metadata and dependencies.**

Key Scripts:
- `dev`: Start Vite dev server
- `build`: Production build
- `preview`: Preview production build
- `type-check`: TypeScript validation

Core Dependencies:
- react, react-dom: UI framework
- zustand: State management
- axios: HTTP client
- date-fns: Date utilities
- d3, d3-force: Visualization (pre-installed)

Build Tools:
- vite: Build tool
- typescript: Type checking
- tailwindcss: Styling framework
- postcss, autoprefixer: CSS processing

#### `tsconfig.json`
**TypeScript compiler configuration.**

Key Settings:
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode enabled
- No unused variables/parameters
- Bundler module resolution

#### `vite.config.ts`
**Vite build and dev server configuration (pre-existing).**

Features:
- React plugin support
- PWA plugin with manifest and icons
- Dev server on port 3000
- API proxy to backend: `/api` → `http://localhost:8000`
- WebSocket proxy: `/ws` → `ws://localhost:8000`
- Source maps disabled in production

#### `tailwind.config.js`
**Tailwind CSS theme configuration.**

Theme:
- Extended colors: gray-900, gray-950 for deep blacks
- Content globs for JSX files and HTML

#### `postcss.config.js`
**PostCSS pipeline with Tailwind and Autoprefixer.**

#### `index.html`
**HTML entry point.**

Features:
- PWA meta tags (viewport, theme-color, app status bar)
- Manifest and favicon links
- Root div for React
- Module script loader for src/index.tsx

#### `.gitignore`
**Git ignore rules for build artifacts and development files.**

Excludes:
- node_modules/, dist/
- .env, .env.*.local
- IDE directories (.vscode, .idea)
- Temp files, logs, OS files

#### `public/manifest.json`
**PWA manifest metadata (pre-existing, comprehensive).**

Features:
- App name, description, icons
- Display mode: standalone
- Theme and background colors
- Screenshots for app stores
- Shortcuts for quick actions
- Share target integration
- Maskable icons for adaptive display

#### `public/sw.ts`
**Service worker with caching strategies (pre-existing).**

Strategies:
- Assets: cache-first
- API: network-first with fallback
- Install: pre-cache index.html
- Activate: cleanup old caches
- Push notifications with rich content
- Notification click handling
- Background sync for offline notes

## Architecture Overview

### Layout System
```
Desktop (≥768px):
┌─────────────────────────────────────┐
│ Left Sidebar │ Main Content │ Status │
│ • Logo      │ • Active Panel│ • Info  │
│ • Search    │ • HomePanel   │ • Status│
│ • Nav Tabs  │ • NotesPanel  │         │
│ • Footer    │ • SecPanel    │         │
└─────────────────────────────────────┘

Mobile (<768px):
┌───────────────────────────┐
│ Logo     ☰ Menu          │ ← Top Bar
├───────────────────────────┤
│                           │
│    Active Panel Content   │
│                           │
├───────────────────────────┤
│  🏠  📝  🔒               │ ← Bottom Nav
└───────────────────────────┘
```

### Component Hierarchy
```
App
├── Left Sidebar
│   ├── Header (Logo)
│   ├── Search
│   ├── Navigation (Tab Buttons)
│   ├── Install Prompt (conditional)
│   └── Footer (Settings)
├── Main Content Area
│   ├── Status Bar
│   └── Active Panel (conditional)
│       ├── HomePanel
│       ├── NotesPanel
│       └── SecurityPanel
└── Right Sidebar (desktop only)
    ├── Header
    ├── Status Items
    └── Settings Button
```

### Data Flow
```
App (manages activeTab, isMobile, installPrompt)
  ↓
useAppStore (Zustand store with localStorage)
  ↓
Active Panel Component
  ↓
API Calls (axios / WebSocket)
  ↓
Backend (/api/ha, /api/ai, /api/security, /ws/security)
```

## Styling Approach

### Tailwind CSS
- Utility-first CSS framework
- Responsive classes (sm:, md:, lg:)
- Dark mode support with dark: prefix
- Custom dark theme colors (gray-900, gray-950)
- No CSS files to maintain

### Dark Theme
```
Background:
  Primary: #0f0f0f (gray-900)
  Darker:  #0a0a0a (gray-950)

Text:
  Primary: #ffffff (white)
  Secondary: #d1d5db (gray-300)
  Tertiary: #9ca3af (gray-400)

Accents:
  Active: #2563eb (blue-600)
  Hover: #1d4ed8 (blue-700)
  Success: #16a34a (green-600)
  Error: #dc2626 (red-600)
```

## API Integration

### Axios Configuration
- Base URL handled by Vite proxy
- Error handling in components
- Request/response logging in browser console

### WebSocket Management
- Manual connection management in SecurityPanel
- Automatic reconnection with 3-second delay
- Message parsing and state update
- Proper cleanup on unmount

### Backend Endpoints Used
```
Home Assistant:
  GET /api/ha/devices
  POST /api/ha/light/{entity_id}
  POST /api/ha/switch/{entity_id}
  POST /api/ha/scene/{scene_id}

Notes & AI:
  GET /api/ai/search/semantic
  POST /api/ai/chat
  POST /api/notes/{id}/suggest-title
  POST /api/notes/{id}/key-points

Security:
  GET /api/security/events
  GET /api/security/cameras
  POST /api/security/event
  WS /ws/security

Health:
  GET /health
```

## Performance Considerations

1. **Lazy Loading**: Panels render conditionally based on activeTab
2. **Optimistic Updates**: Home panel updates UI immediately, then confirms with server
3. **Debounced Search**: Notes search debounces user input
4. **Memoization**: useCallback for event handlers prevents unnecessary re-renders
5. **Caching**: Service worker caches assets and API responses
6. **Code Splitting**: Vite automatically chunks components

## Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Color contrast meets WCAG standards
- Focus states on interactive elements
- Mobile-friendly touch targets
- Prefers-reduced-motion support

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Android Chrome/Firefox
- iOS Safari (with PWA support)

## Next Steps for Production

1. **Environment Variables**: Create `.env.production` for production API endpoint
2. **Icons**: Generate app icons (192x192, 512x512, maskable versions)
3. **Screenshots**: Create PWA screenshots for app store listing
4. **Analytics**: Add tracking for user engagement
5. **Error Monitoring**: Integrate Sentry or similar
6. **Testing**: Add unit/integration tests (Jest, Vitest)
7. **CI/CD**: Setup GitHub Actions for automated builds
8. **Deployment**: Push to production server or CDN

## Troubleshooting

### Service Worker Issues
- Clear browser cache and storage
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check DevTools → Application → Service Workers

### WebSocket Connection Fails
- Ensure backend is running on port 8000
- Check proxy configuration in vite.config.ts
- Browser console will show connection errors

### Types Not Recognized
- Run `npm run type-check` to identify issues
- Ensure imports use correct paths with `/types/index`

### Styling Not Applied
- Verify Tailwind JIT is running
- Check browser DevTools for CSS loading
- Clear cache and reload

## Development Tips

1. **Dev Server**: `npm run dev` includes hot module reload
2. **Debug**: Use browser DevTools and React DevTools extension
3. **Console Logging**: Enabled in development, filtered in production
4. **TypeScript**: Strict mode catches type errors early
5. **Git Hooks**: Pre-commit hooks can run `npm run type-check`

---

**Last Updated**: May 16, 2026
**Version**: 0.1.0
**Status**: Ready for development and testing
