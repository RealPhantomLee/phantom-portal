import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

// Initialize PWA utilities
import { initializePushNotifications } from "./pwa/push";
import { initializeInstallPrompt, setupAppLifecycleListeners } from "./pwa/install";

// Initialize stores
import { useAppStore } from "./stores/appStore";

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("[App] Service Worker registered successfully", registration);

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New service worker available, notify user
              console.log(
                "[App] New service worker available, update ready"
              );
              // Optionally show update notification to user
            }
          });
        }
      });
    } catch (err) {
      console.error("[App] ServiceWorker registration failed:", err);
    }
  });
}

// Initialize PWA features
(async () => {
  try {
    // Initialize install prompt handling
    initializeInstallPrompt();
    setupAppLifecycleListeners();
    console.log("[App] Install prompt initialized");

    // Initialize push notifications
    await initializePushNotifications();
    console.log("[App] Push notifications initialized");
  } catch (error) {
    console.error("[App] Failed to initialize PWA features:", error);
  }
})();

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
