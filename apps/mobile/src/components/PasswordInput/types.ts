/**
 * PasswordInput types, on native — the shared contract whole; nothing
 * platform-specific is added. `PasswordInput.tsx` and `PasswordStrengthBar.tsx`
 * declare these same shapes inline today — the next touch on those files
 * points them here.
 */
import type { PasswordInputPropsBase, PasswordStrengthBarPropsBase } from '@salmon/shared';

export type PasswordInputProps = PasswordInputPropsBase;
export type PasswordStrengthBarProps = PasswordStrengthBarPropsBase;
