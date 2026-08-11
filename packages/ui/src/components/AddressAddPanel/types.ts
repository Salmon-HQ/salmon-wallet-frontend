import type { AddressBookAddBaseProps } from '@salmon/shared';

export interface AddressAddPanelProps extends AddressBookAddBaseProps {
  /** Inline error message shown near the save button (write failures) */
  errorText?: string;
}
