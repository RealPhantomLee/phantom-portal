# Phantom Portal Frontend

A modern, responsive React + TypeScript web portal for managing notes, security events, and Home Assistant devices.

## Features

- **Responsive Design**: Three-column desktop layout with mobile hamburger menu
- **Dark Theme**: VaultKeeper-inspired dark UI with light text
- **Real-time Updates**: WebSocket support for live security events
- **PWA Ready**: Install as standalone app with offline support
- **Type-Safe**: Full TypeScript with strict mode
- **State Management**: Zustand for localStorage-persisted app state

## Project Structure

```
src/
├── App.tsx              # Main component with layout and navigation
├── index.tsx            # Entry point, service worker registration
├── index.css            # Tailwind + global styles
├── types/
│   └── index.ts         # TypeScript interfaces
├── stores/
│   └── appStore.ts      # Zustand store for app state
└── panels/
    ├── HomePanel.tsx    # Home Assistant devices control
    ├── NotesPanel.tsx   # Semantic search for notes
    └── SecurityPanel.tsx # Real-time security events
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts Vite dev server on `http://localhost:3000` with API proxy to backend at `http://localhost:8000`.

### Build

```bash
npm run build
```

Creates optimized production build in `dist/`.

### Type Check

```bash
npm run type-check
```

Verifies TypeScript compilation without emitting code.

## Architecture

### Layout

**Desktop** (3-column):
- Left sidebar: Navigation, search, logo
- Center: Active panel (Home, Notes, Security)
- Right sidebar: Quick status, connection info

**Mobile** (responsive):
- Top bar: Logo + hamburger menu
- Content area: Active panel
- Bottom nav: Tab buttons

### State Management

Uses Zustand for:
- `activeTab`: Currently selected tab (persisted to localStorage)
- `isInstallPromptVisible`: PWA install prompt state
- `notificationsEnabled`: Notification permissions flag

### API Integration

- **Axios** for REST calls
- **WebSocket** for real-time security events
- Proxy to `/api` and `/ws` backends

### Components

**HomePanel**: Lists Home Assistant devices with on/off control
**NotesPanel**: Semantic search across notes via embeddings
**SecurityPanel**: Streams motion events via WebSocket with thumbnails and AI narration

## PWA Support

The app includes:
- Service worker with network/cache strategies
- Install prompt integration
- Manifest for app metadata
- Offline fallback for API calls
- Push notification support

## Styling

Uses **Tailwind CSS** with custom dark theme colors. All components use utility classes for responsive, type-safe styling.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- PWA support on Android and iOS with webkit prefixes
