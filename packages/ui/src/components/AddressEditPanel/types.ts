import type { AddressEditPanelPropsBase } from '@salmon/shared';

export interface AddressEditPanelProps extends AddressEditPanelPropsBase {
  /** Inline error message shown near the save button (write failures) */
  errorText?: string;
}
