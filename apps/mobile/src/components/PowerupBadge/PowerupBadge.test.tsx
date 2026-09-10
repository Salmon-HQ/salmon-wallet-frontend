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

  it('keeps the accent for core and a plain surface for community', () => {
    render(
      <>
        <PowerupBadge testID="core" tier="core" />
        <PowerupBadge testID="community" tier="community" />
      </>
    );

    expect(flatten(screen.getByTestId('core').props.style).backgroundColor).toBe(
      semantic.accent.tint
    );
    expect(flatten(screen.getByTestId('community').props.style).backgroundColor).toBe(
      semantic.surface.raised
    );
  });
});
