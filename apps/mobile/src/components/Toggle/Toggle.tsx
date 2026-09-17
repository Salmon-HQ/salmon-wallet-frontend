/**
 * Toggle — the kit's on/off control, a thin wrapper over React Native's own
 * `Switch` (spec: promote the ad hoc switches into one shared twin). Same
 * inks as the DOM twin: checked reads `accent.ink` on the track, unchecked
 * `border.default` (the card token vanished against the row's own card
 * ground, leaving the off state invisible), thumb always `text.primary` —
 * copied from `SecurityPanel`'s switch, which drew these tokens first.
 *
 * `Switch` has no size prop the two platforms can share, so this keeps RN's
 * own default geometry rather than fighting it with a `transform: scale` —
 * note that the DOM twin's track (44×24, 20 thumb) and RN's native switch
 * are close but not pixel-identical across iOS/Android.
 */
import React from 'react';
import { Switch } from 'react-native';
import { useSemantic } from '../../theme/useThemedStyles';
import type { ToggleProps } from './types';

export const Toggle: React.FC<ToggleProps> = ({
  value,
  onValueChange,
  accessibilityLabel,
  accessibilityHint,
  disabled,
  testID,
}) => {
  const { accent, border, text } = useSemantic();
  return (
    <Switch
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: border.default, true: accent.ink }}
      thumbColor={text.primary}
    />
  );
};
