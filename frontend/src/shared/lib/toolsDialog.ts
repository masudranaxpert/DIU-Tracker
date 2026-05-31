import { Dialog } from '@capacitor/dialog';

export function showToolsAlert(message: string, title = 'PDF Tools'): Promise<void> {
  return Dialog.alert({ message, title });
}
