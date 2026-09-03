import type { AddressAddPanelPropsBase } from '@salmon/shared';

export interface AddressAddPanelProps extends AddressAddPanelPropsBase {
  /** Inline error message shown near the save button (write failures) */
  errorText?: string;
}
