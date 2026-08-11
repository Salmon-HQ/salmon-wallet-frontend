import type { AddressBookEditBaseProps } from '@salmon/shared';

export interface AddressEditPanelProps extends AddressBookEditBaseProps {
  /** Inline error message shown near the save button (write failures) */
  errorText?: string;
}
