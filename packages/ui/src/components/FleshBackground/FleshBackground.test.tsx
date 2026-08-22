/**
 * @vitest-environment jsdom
 *
 * The DOM mirror of the mobile test: the component renders the marbled
 * drawing — every fill in `fleshFills`, as pattern paths.
 */
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The @salmon/shared barrel pulls react-native into the jsdom bundle; the
// theme modules this component draws from are runtime-agnostic, so they are
// loaded directly.
vi.mock('@salmon/shared', async () => {
  const flesh = await import('../../../../shared/src/theme/flesh');
  const { semantic } = await import('../../../../shared/src/theme/semantic');
  return { ...flesh, semantic };
});

import { fleshFills } from '@salmon/shared';
import { FleshBackground } from './FleshBackground';

afterEach(cleanup);

describe('FleshBackground (DOM)', () => {
  it('renders the marbled drawing', () => {
    const { container } = render(<FleshBackground />);
    expect(container.querySelectorAll('pattern path').length).toBe(fleshFills.length);
  });
});
