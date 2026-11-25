/**
 * The disclosure that closes a folded token list: it says how many tokens wait
 * behind it, says "Show less" once open, and announces which of the two it is.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () =>
  require('../../../test-utils/sharedWith').sharedWith({
    ...jest.requireActual('../../../test-utils/themeTokens'),
  })
);

jest.mock('react-i18next', () => {
  // The real English copy, so a wrong key cannot pass.
  const dictionary = require('../../../../../packages/shared/src/locales/en/translation.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as never)?.[part], dictionary);
  return {
    useTranslation: () => ({
      t: (key: string, values: Record<string, unknown> = {}) =>
        String(resolve(key) ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name) =>
          String(values[name] ?? '')
        ),
    }),
  };
});

import { TokenListFoldRow } from './TokenListFoldRow';

describe('TokenListFoldRow', () => {
  it('says how many tokens are folded and announces itself collapsed', () => {
    render(<TokenListFoldRow foldedCount={7} expanded={false} onToggle={jest.fn()} />);

    expect(screen.getByText('Show 7 more')).toBeTruthy();
    expect(screen.getByTestId('token-list-fold-row').props.accessibilityState.expanded).toBe(false);
  });

  it('reads "Show less" and announces itself expanded once open', () => {
    render(<TokenListFoldRow foldedCount={7} expanded onToggle={jest.fn()} />);

    expect(screen.getByText('Show less')).toBeTruthy();
    expect(screen.getByTestId('token-list-fold-row').props.accessibilityState.expanded).toBe(true);
  });

  it('toggles on press', () => {
    const onToggle = jest.fn();
    render(<TokenListFoldRow foldedCount={2} expanded={false} onToggle={onToggle} />);

    fireEvent.press(screen.getByTestId('token-list-fold-row'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
