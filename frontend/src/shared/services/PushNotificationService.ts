import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
  type Token,
} from '@capacitor/push-notifications';
import { apiClient } from './apiClient';

const ANDROID_CHANNEL_ID = 'diu_tracker_updates';
const FOREGROUND_NOTIFICATION_ID_BASE = 40_000;

export type PushAudience = {
  userId?: string;
  batchId?: string;
  section?: string;
  subSection?: string;
};

let storedToken: string | null = null;
let listenersAttached = false;
let localChannelReady = false;
let foregroundIdSeq = 0;
let audience: PushAudience = {};

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

async function ensureAndroidChannel(): Promise<void> {
  if (!isNative() || Capacitor.getPlatform() !== 'android' || localChannelReady) {
    return;
  }
  try {
    await LocalNotifications.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: 'Academic updates',
      description: 'Notices, records, and deadlines',
      importance: 4,
      visibility: 1,
      sound: 'default',
      vibration: true,
    });
    localChannelReady = true;
  } catch (err) {
    console.warn('Notification channel setup failed:', err);
  }
}

async function syncTokenToServer(token: string): Promise<void> {
  if (!audience.batchId) {
    return;
  }
  const { error } = await apiClient.post('/push/register', {
    fcm_token: token,
    batch_id: audience.batchId,
    section: audience.section ?? null,
    sub_section: audience.subSection ?? null,
    user_id: audience.userId ?? null,
    platform: Capacitor.getPlatform(),
  });
  if (error) {
    console.warn('Push token sync failed:', error);
  }
}

export function handlePushNotificationTap(notification: ActionPerformed): void {
  const data = notification.notification?.data ?? {};
  window.dispatchEvent(new CustomEvent('diu-push-navigate', { detail: data }));
}

async function showForegroundAlert(notification: PushNotificationSchema): Promise<void> {
  const title = notification.title ?? 'DIU Tracker';
  const body = notification.body ?? '';
  if (!body) {
    return;
  }
  await ensureAndroidChannel();
  const id = FOREGROUND_NOTIFICATION_ID_BASE + (++foregroundIdSeq % 10_000);
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          channelId: ANDROID_CHANNEL_ID,
          extra: notification.data,
        },
      ],
    });
  } catch (err) {
    console.warn('Foreground notification display failed:', err);
  }
}

function attachListeners(): void {
  if (listenersAttached) {
    return;
  }
  listenersAttached = true;

  PushNotifications.addListener('registration', async (token: Token) => {
    if (!token.value) {
      return;
    }
    storedToken = token.value;
    await syncTokenToServer(token.value);
  });

  PushNotifications.addListener('registrationError', (error: unknown) => {
    console.error('Push registration error:', error);
  });

  PushNotifications.addListener('pushNotificationReceived', async (notification) => {
    await showForegroundAlert(notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', handlePushNotificationTap);
}

/** Update batch/section without re-requesting permission. */
export function setPushAudience(ctx: PushAudience): void {
  audience = { ...ctx };
  if (storedToken) {
    void syncTokenToServer(storedToken);
  }
}

export const initPushNotifications = async (
  userId?: string,
  batchId?: string,
  section?: string,
  subSection?: string,
): Promise<void> => {
  if (!isNative()) {
    return;
  }

  audience = { userId, batchId, section, subSection };

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission denied.');
      return;
    }

    await ensureAndroidChannel();
    attachListeners();
    await PushNotifications.register();

    if (storedToken) {
      await syncTokenToServer(storedToken);
    }
  } catch (err) {
    console.error('Push initialization failed:', err);
  }
};

export const removePushNotifications = async (): Promise<void> => {
  if (!isNative()) {
    return;
  }
  if (storedToken) {
    await apiClient.post('/push/unregister', { fcm_token: storedToken });
  }
  await PushNotifications.removeAllListeners();
  listenersAttached = false;
  storedToken = null;
  audience = {};
};
