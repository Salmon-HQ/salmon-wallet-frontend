/**
 * Featured is the only tier that spends a salmon fill. If official or
 * community ever took one, a catalogue page would be a wall of brand and the
 * badge would stop meaning anything.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

import { semantic } from '@salmon/shared';
import { PowerupBadge } from './PowerupBadge';

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

describe('PowerupBadge', () => {
  it('shouts the tier name in the current locale', () => {
    render(<PowerupBadge tier="community" />);

    expect(screen.getByText('COMMUNITY')).toBeTruthy();
  });

  it('reserves the salmon fill for featured', () => {
    render(
      <>
        <PowerupBadge testID="featured" tier="featured" />
        <PowerupBadge testID="official" tier="official" />
      </>
    );

    expect(flatten(screen.getByTestId('featured').props.style).backgroundColor).toBe(
      semantic.accent.fill
    );
    expect(flatten(screen.getByTestId('official').props.style).backgroundColor).toBe(
      semantic.accent.tint
    );
  });
});
