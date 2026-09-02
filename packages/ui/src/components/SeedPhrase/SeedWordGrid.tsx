/**
 * SeedWordGrid — the recovery phrase shown in numbered cells, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/SeedPhrase/SeedWordGrid.tsx`;
 * same cell, same inks, read off the live mode.
 */
import {
  borderRadius,
  borderWidth,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  tabularNums,
} from '@salmon/shared';
import type { CSSProperties } from 'react';

import { useSemantic } from '../../theme/ThemeProvider';
import type { SeedWordGridProps } from './types';

export function SeedWordGrid({ words, columns = 3 }: SeedWordGridProps) {
  const { border, surface, text } = useSemantic();
  const cardWidth = `calc(${100 / columns}% - ${spacing.sm}px)`;

  /**
   * The Bedrock Rule (DESIGN.md) governs the surface a seed phrase actually
   * rests on, and that is the cell rather than the screen behind it: the page
   * already stands on bedrock, so a translucent cell drawn over it puts a live
   * backdrop directly under the words. The cell takes the same opaque ground.
   */
  const cell: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    boxSizing: 'border-box',
    width: cardWidth,
    backgroundColor: surface.bedrock,
    border: `${borderWidth.thin}px solid ${border.raised}`,
    borderRadius: borderRadius.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    gap: spacing.xs,
  };

  /**
   * Seed Phrase Rule (DESIGN.md): cell numbers are `text.tertiary` at label
   * size so they are never mistaken for part of the phrase — the salmon accent
   * stays out of the numbers.
   */
  const index: CSSProperties = {
    ...tabularNums.css,
    color: text.tertiary,
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.label,
    minWidth: componentSizes.iconSizeSmall,
  };

  /**
   * Seed words are Geist Mono at the larger mono size, weight 500 (the Seed
   * Phrase Rule) — the most position-critical string in the app, read character
   * by character.
   */
  const word: CSSProperties = {
    color: text.primary,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.monoLg,
    fontWeight: fontWeight.medium,
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
      {words.map((value, position) => (
        <div key={position} style={cell} data-testid={`seed-word-cell-${position + 1}`}>
          <span style={index}>{position + 1}</span>
          <span style={word}>{value}</span>
        </div>
      ))}
    </div>
  );
}
