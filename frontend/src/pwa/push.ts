/**
 * Web Push Notification System
 * Handles subscription to push notifications and server communication
 */

const STORAGE_KEY = 'phantom_push_subscription';
const API_SUBSCRIBE_ENDPOINT = '/api/push/subscribe';
const API_UNSUBSCRIBE_ENDPOINT = '/api/push/unsubscribe';

/**
 * Check if push notifications are supported in the browser
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Request notification permission from user
 * @returns Promise that resolves to permission status
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications are not supported in this browser');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return 'denied';
}

/**
 * Get the service worker registration
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('Service Worker not registered');
    }
    return registration;
  } catch (error) {
    throw new Error(`Failed to get service worker registration: ${error}`);
  }
}

/**
 * Subscribe to push notifications
 * 1. Gets push subscription from browser
 * 2. Sends subscription to backend
 * 3. Stores subscription locally
 * @returns Promise that resolves to the subscription object
 */
export async function subscribeToNotifications(): Promise<PushSubscription | null> {
  try {
    // Check support
    if (!isPushSupported()) {
      throw new Error('Push notifications are not supported');
    }

    // Check permission
    const permission = await requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await getServiceWorkerRegistration();

    // Get or create push subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('Creating new push subscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // VAPID public key must be provided by backend
        // For now, this will be handled by the backend configuration
        applicationServerKey: await getVapidPublicKey(),
      });
    }

    // Send subscription to backend
    await sendSubscriptionToServer(subscription);

    // Store locally
    storeSubscription(subscription);

    console.log('Successfully subscribed to push notifications');
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromNotifications(): Promise<void> {
  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Notify server
      await sendUnsubscribeToServer(subscription);

      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Clear local storage
      clearStoredSubscription();

      console.log('Successfully unsubscribed from push notifications');
    }
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    throw error;
  }
}

/**
 * Get stored subscription from localStorage
 */
export function retrieveSubscription(): PushSubscription | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    // localStorage can only store strings, so we store the JSON and return it for reference
    // The actual subscription should be managed by the push manager
    const data = JSON.parse(stored);
    console.log('Retrieved stored subscription data:', data);
    return data;
  } catch (error) {
    console.error('Failed to retrieve stored subscription:', error);
    return null;
  }
}

/**
 * Store subscription in localStorage for reference
 * Note: The actual subscription is managed by the browser's push manager
 */
function storeSubscription(subscription: PushSubscription): void {
  try {
    const subscriptionJSON = subscription.toJSON();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptionJSON));
    console.log('Subscription stored locally');
  } catch (error) {
    console.error('Failed to store subscription:', error);
  }
}

/**
 * Clear stored subscription from localStorage
 */
function clearStoredSubscription(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear stored subscription:', error);
  }
}

/**
 * Get VAPID public key from backend
 * This should be provided by the backend for the specific web push service
 */
async function getVapidPublicKey(): Promise<Uint8Array | undefined> {
  try {
    const response = await fetch('/api/push/vapid-public-key');
    if (!response.ok) {
      console.warn('Could not fetch VAPID public key');
      return undefined;
    }

    const { publicKey } = await response.json();
    if (publicKey) {
      // Convert base64 string to Uint8Array
      return base64ToUint8Array(publicKey);
    }
    return undefined;
  } catch (error) {
    console.warn('Failed to get VAPID public key:', error);
    return undefined;
  }
}

/**
 * Send subscription to backend for storage
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch(API_SUBSCRIBE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    console.log('Subscription sent to server');
  } catch (error) {
    console.error('Failed to send subscription to server:', error);
    throw error;
  }
}

/**
 * Notify server that user has unsubscribed
 */
async function sendUnsubscribeToServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch(API_UNSUBSCRIBE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    if (!response.ok) {
      console.warn(`Failed to notify server of unsubscribe: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send unsubscribe to server:', error);
  }
}

/**
 * Convert base64 string to Uint8Array
 * Used for VAPID public key conversion
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(b64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Test push notification (for development)
 */
export async function testPushNotification(): Promise<void> {
  try {
    const response = await fetch('/api/push/test', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to send test notification: ${response.statusText}`);
    }

    console.log('Test notification sent');
  } catch (error) {
    console.error('Failed to send test notification:', error);
    throw error;
  }
}

/**
 * Check if user is currently subscribed
 */
export async function isSubscribed(): Promise<boolean> {
  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}

/**
 * Initialize push notifications (call this on app load)
 * Checks for existing subscription and requests permission if needed
 */
export async function initializePushNotifications(): Promise<void> {
  try {
    if (!isPushSupported()) {
      console.log('Push notifications are not supported');
      return;
    }

    const isCurrentlySubscribed = await isSubscribed();

    if (isCurrentlySubscribed) {
      console.log('Already subscribed to push notifications');
      return;
    }

    // Auto-subscribe if permission is already granted
    if (Notification.permission === 'granted') {
      console.log('Notification permission already granted, subscribing...');
      await subscribeToNotifications();
    }
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
  }
}
