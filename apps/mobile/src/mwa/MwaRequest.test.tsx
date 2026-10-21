import React from 'react';
import { render, screen } from '@testing-library/react-native';

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
  MWARequestType: { SignMessagesRequest: 'SIGN_MESSAGES' },
  verifyCallingPackage: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../components/ConfirmSheet', () => ({
  ConfirmSheet: (props: { title: string; message: string }) => {
    const { Text: T } = jest.requireActual('react-native');
    return <T testID="sheet-message">{props.message}</T>;
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
