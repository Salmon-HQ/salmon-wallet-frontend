import type { CSSProperties } from 'react';
import type { InputAddressPropsBase, RecipientInputPropsBase } from '@salmon/shared';

/**
 * The DOM half of `RecipientInputPropsBase`: the contract plus a style. The
 * mobile twin adds the QR scan affordance; here the same slot pastes from
 * the clipboard — the side panel has no camera.
 */
export interface RecipientInputProps extends RecipientInputPropsBase {
  style?: CSSProperties;
  className?: string;
}

/**
 * InputAddress — `RecipientInput` with the validation attached, for callers
 * that hand in an address and read back a verdict (the address-book panels).
 * The send flow composes `RecipientInput` directly, as mobile does, and keeps
 * the verdict on the screen.
 */
export interface InputAddressProps extends InputAddressPropsBase<CSSProperties> {
  className?: string;
}
