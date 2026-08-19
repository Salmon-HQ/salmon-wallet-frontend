/**
 * The component has one drawing now — marbled — so the behavior worth pinning
 * is that it actually renders it: every fill in `fleshFills`, as paths.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Path } from 'react-native-svg';

// The @salmon/shared barrel drags the ESM-only @solana/kit into Jest; the
// theme modules the component draws from are runtime-agnostic, so they are
// loaded directly (the ReceiveSheet test's deep-requireActual convention).
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/flesh'),
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
}));

import { fleshFills } from '@salmon/shared';

import { FleshBackground } from './FleshBackground';

describe('FleshBackground', () => {
  it('renders the marbled drawing', () => {
    const { UNSAFE_root } = render(<FleshBackground />);
    expect(UNSAFE_root.findAllByType(Path).length).toBe(fleshFills.length);
  });
});
