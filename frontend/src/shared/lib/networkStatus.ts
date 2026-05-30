import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export async function isNetworkAvailable(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Network.getStatus();
      return status.connected;
    } catch {
      return false;
    }
  }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
