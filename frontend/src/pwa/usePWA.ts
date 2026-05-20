/**
 * React Hook for PWA functionality
 * Provides easy integration of install prompt and push notifications in React components
 */

import { useEffect, useState, useCallback } from 'react';
import * as pushUtils from './push';
import * as installUtils from './install';

export interface PWAState {
  // Install prompt
  canInstall: boolean;
  isInstalled: boolean;

  // Push notifications
  notificationsSupported: boolean;
  notificationsEnabled: boolean;
  isSubscribed: boolean;

  // Loading states
  isSubscribing: boolean;
  isUnsubscribing: boolean;
}

export interface PWAActions {
  showInstallPrompt: () => Promise<'accepted' | 'dismissed'>;
  subscribeToPushNotifications: () => Promise<void>;
  unsubscribeFromPushNotifications: () => Promise<void>;
  testPushNotification: () => Promise<void>;
}

/**
 * usePWA hook: manage PWA install prompts and push notifications
 * @returns {[PWAState, PWAActions]} Current state and available actions
 */
export function usePWA(): [PWAState, PWAActions] {
  // Install prompt state
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Push notification state
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Loading states
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      // Initialize install prompt
      installUtils.initializeInstallPrompt();
      installUtils.setupAppLifecycleListeners();
      const installInfo = installUtils.getInstallInfo();
      setCanInstall(installInfo.canInstall);
      setIsInstalled(installInfo.isInstalled);

      // Subscribe to install prompt changes
      const unsubscribe = installUtils.onInstallPromptChange((available) => {
        setCanInstall(available);
      });

      // Initialize push notifications
      setNotificationsSupported(pushUtils.isPushSupported());

      if (pushUtils.isPushSupported()) {
        // Check notification permission
        const permission = Notification.permission;
        setNotificationsEnabled(permission === 'granted');

        // Check if already subscribed
        const subscribed = await pushUtils.isSubscribed();
        setIsSubscribed(subscribed);

        // Initialize push notifications (auto-subscribe if permission granted)
        await pushUtils.initializePushNotifications();
      }

      return unsubscribe;
    };

    const unsubscribe = initialize();

    return () => {
      unsubscribe.then((fn) => fn?.());
    };
  }, []);

  // Install prompt handler
  const handleShowInstallPrompt = useCallback(async () => {
    return installUtils.showInstallPrompt();
  }, []);

  // Subscribe to push notifications
  const handleSubscribeToPush = useCallback(async () => {
    if (!notificationsSupported) {
      console.warn('Push notifications not supported');
      return;
    }

    setIsSubscribing(true);
    try {
      const subscription = await pushUtils.subscribeToNotifications();
      setNotificationsEnabled(subscription !== null);
      setIsSubscribed(subscription !== null);

      if (subscription) {
        console.log('Successfully subscribed to push notifications');
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    } finally {
      setIsSubscribing(false);
    }
  }, [notificationsSupported]);

  // Unsubscribe from push notifications
  const handleUnsubscribeFromPush = useCallback(async () => {
    setIsUnsubscribing(true);
    try {
      await pushUtils.unsubscribeFromNotifications();
      setNotificationsEnabled(false);
      setIsSubscribed(false);
      console.log('Successfully unsubscribed from push notifications');
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    } finally {
      setIsUnsubscribing(false);
    }
  }, []);

  // Test push notification
  const handleTestPushNotification = useCallback(async () => {
    try {
      await pushUtils.testPushNotification();
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  }, []);

  const state: PWAState = {
    canInstall,
    isInstalled,
    notificationsSupported,
    notificationsEnabled,
    isSubscribed,
    isSubscribing,
    isUnsubscribing,
  };

  const actions: PWAActions = {
    showInstallPrompt: handleShowInstallPrompt,
    subscribeToPushNotifications: handleSubscribeToPush,
    unsubscribeFromPushNotifications: handleUnsubscribeFromPush,
    testPushNotification: handleTestPushNotification,
  };

  return [state, actions];
}
