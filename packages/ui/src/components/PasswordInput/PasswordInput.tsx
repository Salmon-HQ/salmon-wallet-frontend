/**
 * PasswordInput — a secure field with a visibility toggle, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PasswordInput/PasswordInput.tsx`:
 * `input.ground` fill, `input.edge` stroke that turns `accent.ink` on focus
 * and `status.danger` on error, `text.primary` value, `input.placeholder`
 * placeholder, the eye glyph in `text.secondary`, and the error line under
 * the field in `status.danger`. Every ink is read off the live mode.
 *
 * The wrapper — not the `<input>` inside it — is the field's visual boundary,
 * so it is what wears `FIELD_SHELL_CLASS`: the accent edge on focus and the
 * keyboard ring come from that one rule, shared with every other field.
 * Ringing the bare input drew a hard-cornered rectangle inside the rounded
 * wrapper.
 */
import styled from '@emotion/styled';
import {
  borderWidth,
  componentSizes,
  fontFamily,
  fontSize,
  opacity,
  spacing,
} from '@salmon/shared';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EyeIcon, EyeSlashIcon, iconSize } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { FIELD_SHELL_CLASS, FIELD_SHELL_ERROR_CLASS, focusRingNone } from '../../theme';
import type { PasswordInputProps } from './types';

const Wrapper = styled('div')<{ $edge: string; $ground: string }>(({ $edge, $ground }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  boxSizing: 'border-box',
  height: componentSizes.inputHeight,
  backgroundColor: $ground,
  border: `${borderWidth.thin}px solid ${$edge}`,
  borderRadius: componentSizes.inputRadius,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
}));

const Field = styled('input')<{ $ink: string; $placeholder: string }>(({ $ink, $placeholder }) => ({
  flex: 1,
  minWidth: 0,
  border: 'none',
  ...focusRingNone,
  background: 'transparent',
  padding: 0,
  color: $ink,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.bodyLg,
  '&::placeholder': {
    color: $placeholder,
    opacity: opacity.full,
  },
}));

export function PasswordInput({
  value,
  onChangeText,
  placeholder,
  error,
  editable = true,
  autoFocus,
  onSubmitEditing,
  className,
  style,
  testID,
}: PasswordInputProps) {
  const { t } = useTranslation();
  const { input, status, text } = useSemantic();
  const [showPassword, setShowPassword] = useState(false);

  // Focus is the shell's business (`FIELD_SHELL_CLASS`), not this component's:
  // the border it draws is the resting one, and error is the only state that
  // overrides it here.
  const edge = error ? status.danger : input.edge;

  const handleToggle = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && onSubmitEditing) {
        onSubmitEditing();
      }
    },
    [onSubmitEditing]
  );

  return (
    <div className={className} style={{ width: '100%', ...style }}>
      <Wrapper
        className={[FIELD_SHELL_CLASS, error ? FIELD_SHELL_ERROR_CLASS : null]
          .filter(Boolean)
          .join(' ')}
        $edge={edge}
        $ground={input.ground}
      >
        <Field
          $ink={text.primary}
          $placeholder={input.placeholder}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder ?? t('lock.password_placeholder')}
          disabled={!editable}
          autoFocus={autoFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          data-testid={testID}
        />
        <button
          type="button"
          onClick={handleToggle}
          aria-label={showPassword ? t('general.hide_password') : t('general.show_password')}
          data-testid={testID ? `${testID}-toggle` : undefined}
          tabIndex={-1}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xs,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          {showPassword ? (
            <EyeSlashIcon size={iconSize.lg} color={text.secondary} />
          ) : (
            <EyeIcon size={iconSize.lg} color={text.secondary} />
          )}
        </button>
      </Wrapper>
      {error && (
        <p
          style={{
            color: status.danger,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.xs,
            margin: 0,
            marginTop: spacing.sm,
            paddingLeft: spacing.xs,
            paddingRight: spacing.xs,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
