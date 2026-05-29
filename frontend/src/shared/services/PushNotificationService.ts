import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';

// FCM token storage - TODO: Add backend endpoint for persistent storage
let storedToken: string | null = null;

export const initPushNotifications = async (userId?: string, batchId?: string, section?: string) => {
  try {
    // Request permission to use push notifications
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permissions denied.');
      return;
    }

    // Register with FCM
    await PushNotifications.register();

    // On success, we get the token
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      
      if (token.value) {
        storedToken = token.value;
        // TODO: Store token in backend via API endpoint
        console.log('FCM token stored locally. Backend sync pending implementation.');
      }
    });

    // Error on registration
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error: ' + JSON.stringify(error));
    });

    // Handle received notification while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      // You can trigger a custom toast or sound here if needed
    });

    // Handle tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed:', notification.actionId, notification.notification);
      // Logic for navigating to a specific screen can go here
    });

  } catch (err) {
    console.error('Initialization of push notifications failed:', err);
  }
};

export const removePushNotifications = async () => {
  await PushNotifications.removeAllListeners();
  storedToken = null;
};
