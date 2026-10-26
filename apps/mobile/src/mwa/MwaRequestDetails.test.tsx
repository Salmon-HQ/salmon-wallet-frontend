import React from 'react';
import { render, screen, within } from '@testing-library/react-native';

import { MwaRequestDetails } from './MwaRequestDetails';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../test-utils/themeTokens'),
}));

// The bubble rides reanimated, which has no worklets runtime in Jest; it is
// only the site's mark here.
jest.mock('../components/IconBubble', () => ({ IconBubble: () => null }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { origin?: string }) =>
      options?.origin ? `${key} ${options.origin}` : key,
  }),
}));

const ORIGIN = 'https://dapp.example';
const ADDRESS = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';

/**
 * Digital Asset Links vouch only for native apps: any page or app can claim
 * any site. What the sheet says about who is asking is the security surface
 * here, so it is pinned line by line.
 */
describe('MwaRequestDetails — who is asking', () => {
  it('names an unverified app as a claim, after a warning that comes first', () => {
    render(<MwaRequestDetails origin={ORIGIN} name="Example" unverified />);

    expect(screen.getByTestId('mwa-site-origin').props.children).toBe(
      `dapp.mwa_unverified_origin ${ORIGIN}`
    );
    expect(screen.getByTestId('mwa-unverified')).toHaveTextContent(`dapp.mwa_unverified ${ORIGIN}`);
    const order = screen
      .getAllByText(/dapp\.mwa_unverified|dapp\.requesting_site/)
      .map((node) => node.props.children);
    expect(order[0]).toBe(`dapp.mwa_unverified ${ORIGIN}`);
  });

  it('states a verified origin plainly, with no warning', () => {
    render(<MwaRequestDetails origin={ORIGIN} name="Example" unverified={false} />);

    expect(screen.getByTestId('mwa-site-origin').props.children).toBe(ORIGIN);
    expect(screen.queryByTestId('mwa-unverified')).toBeNull();
  });

  it('puts the name the app gives in the site card, never on its own line', () => {
    render(<MwaRequestDetails origin={ORIGIN} name="Example" unverified={false} />);

    expect(within(screen.getByTestId('mwa-site')).getByText('Example')).toBeTruthy();
  });
});

describe('MwaRequestDetails — with what', () => {
  it('names the signing wallet with its full address in mono', () => {
    render(
      <MwaRequestDetails
        origin={ORIGIN}
        name="Example"
        unverified={false}
        account={{ name: 'Savings', address: ADDRESS }}
      />
    );

    const wallet = screen.getByTestId('mwa-wallet');
    expect(within(wallet).getByText('Savings')).toBeTruthy();
    expect(within(wallet).getByText(ADDRESS)).toBeTruthy();
  });

  it('falls back to "current wallet" when the account has no name', () => {
    render(
      <MwaRequestDetails
        origin={ORIGIN}
        name="Example"
        unverified={false}
        account={{ address: ADDRESS }}
      />
    );

    expect(within(screen.getByTestId('mwa-wallet')).getByText('dapp.current_wallet')).toBeTruthy();
  });

  it('shows the message to sign verbatim, in mono, in its own card', () => {
    render(
      <MwaRequestDetails origin={ORIGIN} name="Example" unverified={false} message={'hi\nthere'} />
    );

    const text = screen.getByTestId('mwa-message-text');
    expect(text.props.children).toBe('hi\nthere');
    expect(text.props.style).toEqual(
      expect.objectContaining({ fontFamily: expect.stringMatching(/Mono/) })
    );
  });

  it('draws no wallet or message card when the request carries neither', () => {
    render(<MwaRequestDetails origin={ORIGIN} name="Example" unverified={false} />);

    expect(screen.queryByTestId('mwa-wallet')).toBeNull();
    expect(screen.queryByTestId('mwa-message')).toBeNull();
  });
});
