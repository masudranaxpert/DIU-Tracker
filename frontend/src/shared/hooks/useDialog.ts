import { create } from 'zustand';

type DialogType = 'alert' | 'confirm';

interface DialogState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  close: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  isOpen: false,
  type: 'alert',
  title: '',
  message: '',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  onConfirm: () => {},
  onCancel: () => {},

  alert: (message, title = 'Notification') => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        type: 'alert',
        title,
        message,
        confirmLabel: 'OK',
        onConfirm: () => {
          set({ isOpen: false });
          resolve();
        }
      });
    });
  },

  confirm: (message, title = 'Are you sure?', confirmLabel = 'Confirm', cancelLabel = 'Cancel') => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        confirmLabel,
        cancelLabel,
        onConfirm: () => {
          set({ isOpen: false });
          resolve(true);
        },
        onCancel: () => {
          set({ isOpen: false });
          resolve(false);
        }
      });
    });
  },

  close: () => set({ isOpen: false })
}));
