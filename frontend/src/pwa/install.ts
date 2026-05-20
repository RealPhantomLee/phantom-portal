/**
 * PWA Install Prompt Management
 * Handles the "Install App" button and beforeinstallprompt event
 */

// Store the install prompt event so we can trigger it when user clicks install
let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Callback type for install button visibility changes
export type InstallPromptCallback = (canInstall: boolean) => void;

// List of callbacks to notify when install prompt availability changes
const callbacks: Set<InstallPromptCallback> = new Set();

/**
 * Initialize PWA install prompt handling
 * Should be called early in app lifecycle
 */
export function initializeInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    const e = event as BeforeInstallPromptEvent;

    // Prevent the mini-infobar from appearing
    e.preventDefault();

    // Store the event for later use
    deferredPrompt = e;

    // Notify all listeners that install is available
    notifyInstallPromptAvailable(true);

    console.log('[PWA] Install prompt available');
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');

    // Clear the prompt and notify listeners
    deferredPrompt = null;
    notifyInstallPromptAvailable(false);
  });

  // Listen for when app is launched from home screen
  if (window.navigator && (window.navigator as any).standalone === true) {
    console.log('[PWA] App is running as installed PWA');
  }
}

/**
 * Check if the app can be installed (prompt is available)
 */
export function canInstall(): boolean {
  return deferredPrompt !== null;
}

/**
 * Show the install prompt when user clicks "Install" button
 * @returns Promise that resolves to installation outcome
 */
export async function showInstallPrompt(): Promise<'accepted' | 'dismissed'> {
  if (!deferredPrompt) {
    console.warn('[PWA] Install prompt not available');
    return 'dismissed';
  }

  try {
    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`[PWA] User ${outcome} the install prompt`);

    // Clear the deferred prompt
    deferredPrompt = null;
    notifyInstallPromptAvailable(false);

    return outcome as 'accepted' | 'dismissed';
  } catch (error) {
    console.error('[PWA] Failed to show install prompt:', error);
    return 'dismissed';
  }
}

/**
 * Subscribe to changes in install prompt availability
 * @param callback Function to call when availability changes
 * @returns Function to unsubscribe
 */
export function onInstallPromptChange(callback: InstallPromptCallback): () => void {
  callbacks.add(callback);

  // Return unsubscribe function
  return () => {
    callbacks.delete(callback);
  };
}

/**
 * Notify all listeners of install prompt availability change
 */
function notifyInstallPromptAvailable(available: boolean): void {
  callbacks.forEach((callback) => {
    try {
      callback(available);
    } catch (error) {
      console.error('[PWA] Error in install prompt callback:', error);
    }
  });
}

/**
 * Check if app is running as installed PWA
 */
export function isInstalledPWA(): boolean {
  // Check multiple indicators
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://') ||
    false
  );
}

/**
 * Get information about the installed state
 */
export function getInstallInfo(): {
  canInstall: boolean;
  isInstalled: boolean;
  displayMode: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
} {
  // Check display mode
  const displayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'] as const;
  let displayMode: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser' = 'browser';

  for (const mode of displayModes) {
    if (window.matchMedia(`(display-mode: ${mode})`).matches) {
      displayMode = mode;
      break;
    }
  }

  return {
    canInstall: canInstall(),
    isInstalled: isInstalledPWA(),
    displayMode,
  };
}

/**
 * Setup listeners for app lifecycle events
 * Call this during app initialization
 */
export function setupAppLifecycleListeners(): void {
  // Detect when app is running as installed PWA
  if (isInstalledPWA()) {
    console.log('[PWA] App is running as installed PWA');
    document.body.classList.add('pwa-installed');
  }

  // Listen for display mode changes
  window
    .matchMedia('(display-mode: standalone)')
    .addEventListener('change', (e: MediaQueryListEvent) => {
      if (e.matches) {
        console.log('[PWA] App switched to standalone mode');
        document.body.classList.add('pwa-installed');
      } else {
        console.log('[PWA] App switched to browser mode');
        document.body.classList.remove('pwa-installed');
      }
    });

  // Listen for visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('[PWA] App backgrounded');
    } else {
      console.log('[PWA] App foregrounded');
    }
  });

  // Listen for page unload
  window.addEventListener('beforeunload', () => {
    console.log('[PWA] App unloading');
  });
}

/**
 * Get platform information for PWA
 */
export function getPlatformInfo(): {
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  isMobile: boolean;
  isDesktop: boolean;
} {
  const ua = navigator.userAgent.toLowerCase();

  let os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown' = 'unknown';
  if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'ios';
  } else if (ua.includes('android')) {
    os = 'android';
  } else if (ua.includes('win')) {
    os = 'windows';
  } else if (ua.includes('mac')) {
    os = 'macos';
  } else if (ua.includes('linux') || ua.includes('x11')) {
    os = 'linux';
  }

  const isMobile =
    ua.includes('mobile') ||
    ua.includes('android') ||
    ua.includes('iphone') ||
    ua.includes('ipad') ||
    ua.includes('windows phone');
  const isDesktop = !isMobile;

  return {
    os,
    isMobile,
    isDesktop,
  };
}
