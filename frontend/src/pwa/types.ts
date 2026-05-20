/**
 * TypeScript type definitions for PWA functionality
 */

/**
 * Push notification payload format
 */
export interface PushNotificationPayload {
  title: string;
  options: PushNotificationOptions;
}

export interface PushNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: PushNotificationData;
  actions?: NotificationAction[];
  image?: string;
  dir?: 'auto' | 'ltr' | 'rtl';
  lang?: string;
  timestamp?: number;
  vibrate?: number | number[];
  sound?: string;
}

export interface PushNotificationData {
  url?: string;
  cameraId?: string;
  timestamp?: number | string;
  thumbnail?: string;
  narration?: string;
  [key: string]: any;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

/**
 * Motion detection event from backend
 */
export interface MotionEvent {
  type: 'motion_event';
  timestamp: string;
  camera: string;
  confidence: number;
  thumbnail_url?: string;
  narration?: string;
}

/**
 * Push subscription from browser PushManager
 */
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  expirationTime?: number | null;
}

/**
 * Backend push subscription request
 */
export interface PushSubscribeRequest {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  expirationTime?: number | null;
}

/**
 * Backend push unsubscribe request
 */
export interface PushUnsubscribeRequest {
  endpoint: string;
}

/**
 * VAPID public key response
 */
export interface VapidPublicKeyResponse {
  publicKey: string;
}

/**
 * Subscription stats response
 */
export interface SubscriptionCountResponse {
  total_subscriptions: number;
  users: number;
}

/**
 * Service Worker registration with our custom properties
 */
export interface CustomServiceWorkerRegistration extends ServiceWorkerRegistration {
  onupdatefound?: (() => void) | null;
}

/**
 * App installation info
 */
export interface AppInstallInfo {
  canInstall: boolean;
  isInstalled: boolean;
  displayMode: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
}

/**
 * Platform information
 */
export interface PlatformInfo {
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  isMobile: boolean;
  isDesktop: boolean;
}

/**
 * IndexedDB note for background sync
 */
export interface PendingNote {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  [key: string]: any;
}

/**
 * Service Worker message types
 */
export type ServiceWorkerMessageType = 'SKIP_WAITING' | 'CLEAR_CACHE' | 'GET_CACHE_SIZE';

export interface ServiceWorkerMessage {
  type: ServiceWorkerMessageType;
  payload?: any;
}

/**
 * Service Worker message response
 */
export interface ServiceWorkerMessageResponse {
  type: ServiceWorkerMessageType;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Offline sync event
 */
export interface BackgroundSyncEvent {
  tag: string;
  lastChance?: boolean;
}

/**
 * Cache strategy type
 */
export type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate';

/**
 * Installation prompt result
 */
export type InstallPromptResult = 'accepted' | 'dismissed';

/**
 * Notification click data
 */
export interface NotificationClickData {
  action?: string;
  notification: Notification;
}

/**
 * API response types for push endpoints
 */
export interface ApiResponse<T = any> {
  status: 'ok' | 'error';
  message?: string;
  data?: T;
}

export interface SubscribeResponse extends ApiResponse {
  message: string;
}

export interface TestNotificationResponse extends ApiResponse {
  message: string;
}
