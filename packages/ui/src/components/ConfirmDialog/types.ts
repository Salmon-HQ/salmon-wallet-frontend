export interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  requirePassword?: boolean;
  validatePassword?: (password: string) => Promise<boolean>;
  /** Awaited, so a synchronous handler is equally welcome */
  onConfirm: () => void | Promise<void>;
  /** Test id for the confirm button, so e2e and unit tests can select it. */
  confirmTestID?: string;
}
