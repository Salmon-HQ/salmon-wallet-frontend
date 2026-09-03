/**
 * RevealCover — the bedrock gate over an unrevealed secret (mobile).
 *
 * The DOM twin is `packages/ui/src/components/RevealCover`. The Bedrock Rule
 * (DESIGN.md): the cover is opaque `surface.bedrock`, not a translucent scrim
 * — a scrim over masked cells reads as a loading state and lets the water
 * column through the gate. It fills whatever positioned box it sits in and
 * draws nothing but the eye and its label; the panel behind it owns the
 * secret and decides what the press costs.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  borderRadius,
  fontFamilyNative,
  fontSize,
  s,
  spacing,
  type Semantic,
} from '@salmon/shared';

import { EyeIcon, iconSize } from '../../icons';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import type { RevealCoverProps } from './types';

export function RevealCover({ label, onPress, testID }: RevealCoverProps): React.ReactElement {
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();
  return (
    <TouchableOpacity
      style={styles.cover}
      onPress={onPress}
      activeOpacity={0.8}
      testID={testID}
      accessibilityRole="button"
    >
      <EyeIcon size={iconSize.xl} color={text.primary} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    cover: {
      ...StyleSheet.absoluteFillObject,
      // Declared, not implied by sibling order: a reorder must not uncover the gate.
      zIndex: 10,
      backgroundColor: t.surface.bedrock,
      borderRadius: borderRadius.r3,
      alignItems: 'center',
      justifyContent: 'center',
      gap: s(spacing.sm),
    },
    label: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.bodyLg),
    },
  });
