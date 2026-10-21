import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { verifyCallingPackage } from '@solana-mobile/mobile-wallet-adapter-walletlib';

import { MwaRequest } from './MwaRequest';

const mockAddress = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';
const mockOrigin = 'https://dapp.example';
const mockToken = new Uint8Array([7, 7, 7, 7]);

// `@solana/kit` is ESM Jest cannot load; the MWA helpers only use it inside
// the signing functions, which these tests never reach.
jest.mock('@solana/kit', () => ({}));
jest.mock('@salmon/shared', () => {
  const mwa = jest.requireActual('@salmon/shared/src/utils/mwa');
  return {
    ...mwa,
    ...jest.requireActual('@salmon/shared/src/utils/address'),
    formatSigningAccount: ({ name, address }: { name?: string; address: string }) =>
      `${name} · ${address.slice(0, 4)}`,
    decodeDAppMessage: (data: number[]) => ({ text: String.fromCharCode(...data) }),
    spacing: { lg: 16 },
    useAccountsContext: () => [
      {
        networkId: 'solana-mainnet',
        activeAccount: { name: 'Savings' },
        activeTrustedApps: {
          [mockOrigin]: { address: mockAddress, authToken: mwa.encodeMwaAuthToken(mockToken) },
        },
      },
      {},
    ],
  };
});

jest.mock('@solana-mobile/mobile-wallet-adapter-walletlib', () => ({
  __esModule: true,
  MWARequestFailReason: { UserDeclined: 'USER_DECLINED' },
  MWARequestType: { AuthorizeDappRequest: 'AUTHORIZE_DAPP', SignMessagesRequest: 'SIGN_MESSAGES' },
  verifyCallingPackage: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { origin?: string }) =>
      options?.origin ? `${key} ${options.origin}` : key,
  }),
}));

jest.mock('../components/ConfirmSheet', () => ({
  ConfirmSheet: (props: {
    title: string;
    message: string;
    confirmText?: string;
    requiresHold?: boolean;
    confirmDisabled?: boolean;
  }) => {
    const { Text: T, View: V } = jest.requireActual('react-native');
    return (
      <V>
        <T testID="sheet-title">{props.title}</T>
        <T testID="sheet-message">{props.message}</T>
        <T testID="sheet-confirm">{props.confirmText}</T>
        <T testID="sheet-hold">{props.requiresHold ? 'hold' : 'tap'}</T>
        <T testID="sheet-ready">{props.confirmDisabled ? 'checking' : 'ready'}</T>
      </V>
    );
  },
}));
jest.mock('../components/DepthBackground', () => ({ DepthBackground: () => null }));
jest.mock('../components/TransactionConfirmation', () => ({ TransactionConfirmation: () => null }));

describe('MwaRequest — sign messages', () => {
  // The extension names the signing account on its sign screen; the mobile
  // sheet named only the site and the text.
  it('names the account that signs, after the site', () => {
    const account = { getReceiveAddress: () => mockAddress } as never;
    render(
      <MwaRequest
        account={account}
        respond={jest.fn()}
        request={
          {
            __type: 'SIGN_MESSAGES',
            requestId: 'r1',
            chain: 'solana:mainnet',
            appIdentity: { identityUri: mockOrigin },
            authorizationScope: mockToken,
            payloads: [[104, 105]],
          } as never
        }
      />
    );

    const lines = (screen.getByTestId('sheet-message').props.children as string).split('\n\n');
    expect(lines.slice(0, 3)).toEqual([mockOrigin, 'dapp.wallet_address: Savings · AKnL', 'hi']);
  });
});

/**
 * Digital Asset Links can only vouch for a native app: any web page or app
 * can open a session claiming any site. An unverified claim may still connect
 * and sign in, but the sheet names it as a claim and the approval is held.
 */
describe('MwaRequest — connect and sign in', () => {
  const account = { getReceiveAddress: () => mockAddress } as never;
  const connect = (signInPayload?: object) => (
    <MwaRequest
      account={account}
      respond={jest.fn()}
      request={
        {
          __type: 'AUTHORIZE_DAPP',
          requestId: 'c1',
          chain: 'solana:mainnet',
          appIdentity: { identityUri: mockOrigin, identityName: 'Example' },
          signInPayload,
        } as never
      }
    />
  );
  const firstLine = () =>
    (screen.getByTestId('sheet-message').props.children as string).split('\n\n')[0];

  it.each([
    ['connect', undefined, 'dapp.connect_title'],
    ['sign in', { domain: 'dapp.example' }, 'dapp.sign_in_title'],
  ])('names an unverified %s as a claim and asks for a hold', async (_, signIn, title) => {
    jest.mocked(verifyCallingPackage).mockResolvedValueOnce(false);
    render(connect(signIn));

    await waitFor(() => expect(screen.getByTestId('sheet-ready').props.children).toBe('ready'));
    expect(screen.getByTestId('sheet-title').props.children).toBe(title);
    expect(firstLine()).toBe(`dapp.mwa_unverified_origin ${mockOrigin}`);
    expect(screen.getByTestId('sheet-hold').props.children).toBe('hold');
    expect(screen.getByTestId('sheet-confirm').props.children).toBe('dapp.hold_to_approve');
  });

  it.each([
    ['connect', undefined, 'dapp.approve'],
    ['sign in', { domain: 'dapp.example' }, 'dapp.sign_in_action'],
  ])('keeps a verified %s a plain tap under the site', async (_, signIn, confirm) => {
    jest.mocked(verifyCallingPackage).mockResolvedValueOnce(true);
    render(connect(signIn));

    await waitFor(() => expect(screen.getByTestId('sheet-ready').props.children).toBe('ready'));
    expect(firstLine()).toBe(mockOrigin);
    expect(screen.getByTestId('sheet-hold').props.children).toBe('tap');
    expect(screen.getByTestId('sheet-confirm').props.children).toBe(confirm);
  });
});
