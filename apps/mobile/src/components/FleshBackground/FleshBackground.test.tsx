/**
 * The debug switch is what the owner flips to judge the CTA texture
 * candidates, so the one behavior worth pinning is that it actually picks the
 * drawing: the default render follows `DEBUG_FLESH_VARIANT`, and each
 * explicit variant renders its own geometry.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Path } from 'react-native-svg';

// The @salmon/shared barrel drags the ESM-only @solana/kit into Jest; the
// theme modules the component draws from are runtime-agnostic, so they are
// loaded directly (the ReceiveSheet test's deep-requireActual convention).
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/flesh'),
  ...jest.requireActual('@salmon/shared/src/theme/fleshVariants'),
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
}));

import { fleshTiledStrokes, fleshVariantFills, type FleshVariant } from '@salmon/shared';

import { DEBUG_FLESH_VARIANT } from '../../debug/fleshVariant';
import { FleshBackground } from './FleshBackground';

const expectedPathCount = (variant: FleshVariant): number =>
  variant === 'current' ? fleshTiledStrokes.length : fleshVariantFills[variant].length;

const renderedPathCount = (variant?: FleshVariant): number => {
  const { UNSAFE_root } = render(
    variant === undefined ? <FleshBackground /> : <FleshBackground variant={variant} />
  );
  return UNSAFE_root.findAllByType(Path).length;
};

describe('FleshBackground variant switch', () => {
  it('tells the variants apart by geometry', () => {
    // If two variants ever rendered the same number of paths, the assertions
    // below would stop proving which drawing was chosen.
    const counts = (['current', 'marbled'] as const).map(expectedPathCount);
    expect(new Set(counts).size).toBe(2);
  });

  it.each(['current', 'marbled'] as const)('renders %s when asked', (variant) => {
    expect(renderedPathCount(variant)).toBe(expectedPathCount(variant));
  });

  it('follows the debug switch by default', () => {
    expect(renderedPathCount()).toBe(expectedPathCount(DEBUG_FLESH_VARIANT));
  });
});
