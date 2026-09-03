/**
 * RevealCover — the bedrock gate over an unrevealed secret, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/RevealCover`. The Bedrock
 * Rule (DESIGN.md): the cover is opaque `surface.bedrock`, not a translucent
 * scrim — a scrim over masked cells reads as a loading state and lets the
 * water column through the gate. It fills whatever positioned box it sits in
 * and draws nothing but the eye and its label; the panel behind it owns the
 * secret and decides what the press costs.
 */
import React from 'react';
import { borderRadius, fontFamily, fontSize, fontWeight, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { EyeIcon, iconSize } from '../../icons';
import type { RevealCoverProps } from './types';

export function RevealCover({ label, onPress, testID }: RevealCoverProps): React.ReactElement {
  const { surface, text } = useSemantic();
  return (
    <button
      type="button"
      onClick={onPress}
      data-testid={testID}
      aria-label={label}
      style={{
        position: 'absolute',
        inset: 0,
        // Declared, not implied by sibling order: a reorder must not uncover the gate.
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        margin: 0,
        border: 'none',
        cursor: 'pointer',
        backgroundColor: surface.bedrock,
        borderRadius: borderRadius.r3,
        color: text.primary,
        fontFamily: fontFamily.sans,
        fontWeight: fontWeight.medium,
        fontSize: fontSize.bodyLg,
      }}
    >
      <EyeIcon size={iconSize.xl} color={text.primary} />
      <span>{label}</span>
    </button>
  );
}
