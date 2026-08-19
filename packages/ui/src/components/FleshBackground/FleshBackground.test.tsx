/**
 * @vitest-environment jsdom
 *
 * The DOM mirror of the mobile switch test: the debug constant picks the
 * drawing by default, and each explicit variant renders its own geometry.
 */
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The @salmon/shared barrel pulls react-native into the jsdom bundle; the
// theme modules this component draws from are runtime-agnostic, so they are
// loaded directly.
vi.mock('@salmon/shared', async () => {
  const flesh = await import('../../../../shared/src/theme/flesh');
  const variants = await import('../../../../shared/src/theme/fleshVariants');
  const { semantic } = await import('../../../../shared/src/theme/semantic');
  return { ...flesh, ...variants, semantic };
});

import { fleshTiledStrokes, fleshVariantFills, type FleshVariant } from '@salmon/shared';
import { DEBUG_FLESH_VARIANT } from './fleshVariant';
import { FleshBackground } from './FleshBackground';

const expectedPathCount = (variant: FleshVariant): number =>
  variant === 'current' ? fleshTiledStrokes.length : fleshVariantFills[variant].length;

const renderedPathCount = (variant?: FleshVariant): number => {
  const { container } = render(
    variant === undefined ? <FleshBackground /> : <FleshBackground variant={variant} />
  );
  return container.querySelectorAll('pattern path').length;
};

afterEach(cleanup);

describe('FleshBackground variant switch (DOM)', () => {
  it.each(['current', 'marbled'] as const)('renders %s when asked', (variant) => {
    expect(renderedPathCount(variant)).toBe(expectedPathCount(variant));
  });

  it('follows the debug switch by default', () => {
    expect(renderedPathCount()).toBe(expectedPathCount(DEBUG_FLESH_VARIANT));
  });
});
