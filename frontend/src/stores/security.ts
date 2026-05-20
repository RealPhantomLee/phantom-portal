import { create } from 'zustand';
import { SecurityEvent, Camera, BlinkSystem } from '../types/index';

interface SecurityStore {
  // State
  events: SecurityEvent[];
  cameras: Camera[];
  selectedCamera: string | null;
  armedSystems: Map<string, boolean>;
  loading: boolean;
  error: string | null;
  wsConnected: boolean;

  // Event management
  addEvent: (event: SecurityEvent) => void;
  clearOldEvents: () => void;
  setEvents: (events: SecurityEvent[]) => void;

  // Camera management
  setCameras: (cameras: Camera[]) => void;
  selectCamera: (cameraId: string) => void;
  getSelectedCamera: () => Camera | undefined;

  // System management
  setArmed: (systemId: string, armed: boolean) => void;
  updateArmedSystems: (systems: Map<string, boolean>) => void;
  isSystemArmed: (systemId: string) => boolean;

  // Connection state
  setWsConnected: (connected: boolean) => void;

  // Loading & error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Pagination helpers
  getLatestEvents: (limit: number) => SecurityEvent[];
}

export const useSecurityStore = create<SecurityStore>((set, get) => ({
  events: [],
  cameras: [],
  selectedCamera: null,
  armedSystems: new Map(),
  loading: false,
  error: null,
  wsConnected: false,

  addEvent: (event: SecurityEvent) => {
    set((state) => ({
      events: [event, ...state.events].slice(0, 100), // Keep last 100 events
    }));
  },

  clearOldEvents: () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    set((state) => ({
      events: state.events.filter((e) => e.timestamp > oneHourAgo),
    }));
  },

  setEvents: (events: SecurityEvent[]) => {
    set({ events });
  },

  setCameras: (cameras: Camera[]) => {
    set({ cameras });
    // Auto-select first camera if none selected
    if (cameras.length > 0 && get().selectedCamera === null) {
      set({ selectedCamera: cameras[0].id });
    }
  },

  selectCamera: (cameraId: string) => {
    set({ selectedCamera: cameraId });
  },

  getSelectedCamera: () => {
    const { cameras, selectedCamera } = get();
    return cameras.find((c) => c.id === selectedCamera);
  },

  setArmed: (systemId: string, armed: boolean) => {
    set((state) => {
      const newSystems = new Map(state.armedSystems);
      newSystems.set(systemId, armed);
      return { armedSystems: newSystems };
    });
  },

  updateArmedSystems: (systems: Map<string, boolean>) => {
    set({ armedSystems: systems });
  },

  isSystemArmed: (systemId: string) => {
    return get().armedSystems.get(systemId) ?? false;
  },

  setWsConnected: (connected: boolean) => {
    set({ wsConnected: connected });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  getLatestEvents: (limit: number) => {
    return get().events.slice(0, limit);
  },
}));
