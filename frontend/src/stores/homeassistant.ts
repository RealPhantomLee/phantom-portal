import { create } from 'zustand';
import { HomeAssistantDevice, Scene } from '../types/index';
import axios from 'axios';

interface HomeAssistantStore {
  // State
  devices: HomeAssistantDevice[];
  scenes: Scene[];
  selectedDevices: Set<string>;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;

  // Device management
  setDevices: (devices: HomeAssistantDevice[]) => void;
  setScenes: (scenes: Scene[]) => void;
  updateDevice: (entityId: string, state: string, attributes?: Record<string, any>) => void;
  getDevice: (entityId: string) => HomeAssistantDevice | undefined;
  getDevicesByType: (type: string) => HomeAssistantDevice[];

  // Selection management
  selectDevice: (entityId: string) => void;
  deselectDevice: (entityId: string) => void;
  toggleDeviceSelection: (entityId: string) => void;
  isDeviceSelected: (entityId: string) => boolean;

  // Device control actions
  toggleSwitch: (entityId: string) => Promise<void>;
  setLightState: (entityId: string, state: boolean, brightness?: number, color?: any) => Promise<void>;
  activateScene: (sceneId: string) => Promise<void>;

  // Loading & error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (timestamp: number) => void;

  // Refresh
  loadDevices: () => Promise<void>;
}

export const useHomeAssistantStore = create<HomeAssistantStore>((set, get) => ({
  devices: [],
  scenes: [],
  selectedDevices: new Set(),
  loading: false,
  error: null,
  lastUpdated: null,

  setDevices: (devices: HomeAssistantDevice[]) => {
    set({ devices, lastUpdated: Date.now() });
  },

  setScenes: (scenes: Scene[]) => {
    set({ scenes });
  },

  updateDevice: (entityId: string, state: string, attributes?: Record<string, any>) => {
    set((store) => ({
      devices: store.devices.map((d) =>
        d.entity_id === entityId
          ? {
              ...d,
              state,
              attributes: { ...d.attributes, ...attributes },
            }
          : d
      ),
    }));
  },

  getDevice: (entityId: string) => {
    return get().devices.find((d) => d.entity_id === entityId);
  },

  getDevicesByType: (type: string) => {
    return get().devices.filter((d) => d.type === type);
  },

  selectDevice: (entityId: string) => {
    set((state) => {
      const newSelected = new Set(state.selectedDevices);
      newSelected.add(entityId);
      return { selectedDevices: newSelected };
    });
  },

  deselectDevice: (entityId: string) => {
    set((state) => {
      const newSelected = new Set(state.selectedDevices);
      newSelected.delete(entityId);
      return { selectedDevices: newSelected };
    });
  },

  toggleDeviceSelection: (entityId: string) => {
    const { isDeviceSelected, selectDevice, deselectDevice } = get();
    if (isDeviceSelected(entityId)) {
      deselectDevice(entityId);
    } else {
      selectDevice(entityId);
    }
  },

  isDeviceSelected: (entityId: string) => {
    return get().selectedDevices.has(entityId);
  },

  toggleSwitch: async (entityId: string) => {
    try {
      const device = get().getDevice(entityId);
      if (!device) throw new Error('Device not found');

      const newState = device.state !== 'on';
      const response = await axios.post(`/api/ha/switch/${entityId}`, {
        state: newState,
      });

      if (response.data.device) {
        get().updateDevice(
          entityId,
          response.data.device.state,
          response.data.device.attributes
        );
      }
    } catch (error) {
      set({ error: `Failed to toggle switch: ${error}` });
      throw error;
    }
  },

  setLightState: async (
    entityId: string,
    state: boolean,
    brightness?: number,
    color?: any
  ) => {
    try {
      const body: any = { state };
      if (brightness !== undefined) body.brightness = brightness;
      if (color) body.color = color;

      const response = await axios.post(`/api/ha/light/${entityId}`, body);

      if (response.data.device) {
        get().updateDevice(
          entityId,
          response.data.device.state,
          response.data.device.attributes
        );
      }
    } catch (error) {
      set({ error: `Failed to set light state: ${error}` });
      throw error;
    }
  },

  activateScene: async (sceneId: string) => {
    try {
      const response = await axios.post(`/api/ha/scene/${sceneId}`, {});
      if (response.data.status !== 'activated') {
        throw new Error('Scene activation failed');
      }
    } catch (error) {
      set({ error: `Failed to activate scene: ${error}` });
      throw error;
    }
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setLastUpdated: (timestamp: number) => {
    set({ lastUpdated: timestamp });
  },

  loadDevices: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/ha/devices');
      const devices = response.data as HomeAssistantDevice[];
      get().setDevices(devices);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load devices';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
