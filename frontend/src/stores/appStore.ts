import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppStore } from "../types";

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeTab: "home",
      setActiveTab: (tab) => set({ activeTab: tab }),

      isInstallPromptVisible: false,
      setInstallPromptVisible: (visible) => set({ isInstallPromptVisible: visible }),

      notificationsEnabled: false,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
    }),
    {
      name: "phantom-app-store",
      partialize: (state) => ({
        activeTab: state.activeTab,
        notificationsEnabled: state.notificationsEnabled,
      }),
    }
  )
);
