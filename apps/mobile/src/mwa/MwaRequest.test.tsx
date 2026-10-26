import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, waitFor, within } from '@testing-library/react-native';
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
    // The detail cards are the kit's, drawn for real: what they say about who
    // is asking is what these tests pin.
    ...jest.requireActual('../../test-utils/themeTokens'),
    ...mwa,
    ...jest.requireActual('@salmon/shared/src/utils/address'),
    decodeDAppMessage: (data: number[]) => ({ text: String.fromCharCode(...data) }),
    // The transaction sheet's own preview is not under test: what is, is the
    // site line it is handed and whether its confirm is held.
    toSignAllTransactionsRequest: () => ({}),
    useSolanaTransactionApproval: () => ({
      feeSol: null,
      parsingError: null,
      effects: null,
      effectsLoading: false,
      details: null,
    }),
    dappTransactionDisplay: (input: { origin: string }) => ({ rows: [{ value: input.origin }] }),
    dappTransactionGate: () => ({ requiresHold: false, canApprove: true }),
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
  MWARequestType: {
    AuthorizeDappRequest: 'AUTHORIZE_DAPP',
    SignMessagesRequest: 'SIGN_MESSAGES',
    SignTransactionsRequest: 'SIGN_TRANSACTIONS',
  },
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
    bedrock?: boolean;
    children?: React.ReactNode;
  }) => {
    const { Text: T, View: V } = jest.requireActual('react-native');
    return (
      <V>
        <T testID="sheet-title">{props.title}</T>
        {props.children}
        <T testID="sheet-message">{props.message}</T>
        <T testID="sheet-ground">{props.bedrock ? 'bedrock' : 'thermocline'}</T>
        <T testID="sheet-confirm">{props.confirmText}</T>
        <T testID="sheet-hold">{props.requiresHold ? 'hold' : 'tap'}</T>
        <T testID="sheet-ready">{props.confirmDisabled ? 'checking' : 'ready'}</T>
      </V>
    );
  },
}));
// The bubble rides reanimated, which has no worklets runtime in Jest.
jest.mock('../components/IconBubble', () => ({ IconBubble: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock('../components/TransactionConfirmation', () => ({
  TransactionConfirmation: (props: {
    display: { rows: { value: string }[] };
    confirmLabel?: string;
    requiresHold?: boolean;
    confirmDisabled?: boolean;
  }) => {
    const { Text: T, View: V } = jest.requireActual('react-native');
    return (
      <V>
        <T testID="tx-site">{props.display.rows[0]?.value}</T>
        <T testID="tx-confirm">{props.confirmLabel}</T>
        <T testID="tx-hold">{props.requiresHold ? 'hold' : 'tap'}</T>
        <T testID="tx-ready">{props.confirmDisabled ? 'checking' : 'ready'}</T>
      </V>
    );
  },
}));

describe('MwaRequest — sign messages', () => {
  // The extension names the signing account on its sign screen; the mobile
  // sheet named only the site and the text.
  it('names the site, the account that signs and the message, each in its card, on bedrock', async () => {
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

    // The calling app is checked first; this one is verified.
    await waitFor(() => expect(screen.getByTestId('sheet-ready').props.children).toBe('ready'));
    expect(screen.getByTestId('mwa-site-origin').props.children).toBe(mockOrigin);
    const wallet = screen.getByTestId('mwa-wallet');
    expect(within(wallet).getByText('Savings')).toBeTruthy();
    expect(within(wallet).getByText(mockAddress)).toBeTruthy();
    expect(screen.getByTestId('mwa-message-text').props.children).toBe('hi');
    expect(screen.getByTestId('sheet-message').props.children).toBe('dapp.sign_message_hint');
    expect(screen.getByTestId('sheet-ground').props.children).toBe('bedrock');
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
  const siteLine = () => screen.getByTestId('mwa-site-origin').props.children;

  it.each([
    ['connect', undefined, 'dapp.connect_title'],
    ['sign in', { domain: 'dapp.example' }, 'dapp.sign_in_title'],
  ])('names an unverified %s as a claim and asks for a hold', async (_, signIn, title) => {
    jest.mocked(verifyCallingPackage).mockResolvedValueOnce(false);
    render(connect(signIn));

    await waitFor(() => expect(screen.getByTestId('sheet-ready').props.children).toBe('ready'));
    expect(screen.getByTestId('sheet-title').props.children).toBe(title);
    expect(siteLine()).toBe(`dapp.mwa_unverified_origin ${mockOrigin}`);
    expect(screen.getByTestId('mwa-unverified')).toBeTruthy();
    expect(screen.getByTestId('sheet-ground').props.children).toBe('bedrock');
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
    expect(siteLine()).toBe(mockOrigin);
    expect(screen.queryByTestId('mwa-unverified')).toBeNull();
    expect(screen.getByTestId('sheet-hold').props.children).toBe('tap');
    expect(screen.getByTestId('sheet-confirm').props.children).toBe(confirm);
  });
});

/**
 * The token a connect hands out is the dApp's from then on, but whether the
 * app asking now is the site it names is checked again in every session: an
 * unverified one is named as a claim on every sheet, and each approval costs
 * a hold, not only the connect.
 */
describe('MwaRequest — later requests from an unverified app', () => {
  const account = { getReceiveAddress: () => mockAddress } as never;
  beforeEach(() => {
    jest.mocked(verifyCallingPackage).mockReset().mockResolvedValue(true);
  });
  const signed = (type: 'SIGN_MESSAGES' | 'SIGN_TRANSACTIONS') => (
    <MwaRequest
      account={account}
      respond={jest.fn()}
      request={
        {
          __type: type,
          requestId: 'r2',
          chain: 'solana:mainnet',
          appIdentity: { identityUri: mockOrigin },
          authorizationScope: mockToken,
          payloads: [[104, 105]],
        } as never
      }
    />
  );

  it('names the claim on the message sheet and asks for a hold', async () => {
    jest.mocked(verifyCallingPackage).mockResolvedValueOnce(false);
    render(signed('SIGN_MESSAGES'));

    await waitFor(() => expect(screen.getByTestId('sheet-ready').props.children).toBe('ready'));
    expect(screen.getByTestId('mwa-site-origin').props.children).toBe(
      `dapp.mwa_unverified_origin ${mockOrigin}`
    );
    expect(screen.getByTestId('mwa-unverified')).toBeTruthy();
    expect(screen.getByTestId('sheet-hold').props.children).toBe('hold');
    expect(screen.getByTestId('sheet-confirm').props.children).toBe('dapp.hold_to_approve');
  });

  it("keeps a verified app's message sheet a plain tap under the site", async () => {
    jest.mocked(verifyCallingPackage).mockResolvedValueOnce(true);
    render(signed('SIGN_MESSAGES'));

    await waitFor(() => expect(screen.getByTestId('sheet-ready').props.children).toBe('ready'));
    expect(screen.getByTestId('sheet-hold').props.children).toBe('tap');
    expect(screen.getByTestId('sheet-confirm').props.children).toBe('dapp.sign');
  });

  it('names the claim on the transaction sheet and asks for a hold', async () => {
    jest.mocked(verifyCallingPackage).mockResolvedValueOnce(false);
    render(signed('SIGN_TRANSACTIONS'));

    await waitFor(() => expect(screen.getByTestId('tx-ready').props.children).toBe('ready'));
    expect(screen.getByTestId('tx-site').props.children).toBe(
      `dapp.mwa_unverified_origin ${mockOrigin}`
    );
    expect(screen.getByTestId('tx-hold').props.children).toBe('hold');
    expect(screen.getByTestId('tx-confirm').props.children).toBe('dapp.hold_to_approve');
  });

  it("keeps a verified app's transaction a plain tap when its effects need none", async () => {
    jest.mocked(verifyCallingPackage).mockResolvedValueOnce(true);
    render(signed('SIGN_TRANSACTIONS'));

    await waitFor(() => expect(screen.getByTestId('tx-ready').props.children).toBe('ready'));
    expect(screen.getByTestId('tx-site').props.children).toBe(mockOrigin);
    expect(screen.getByTestId('tx-hold').props.children).toBe('tap');
  });

  // The Bedrock Rule: the transaction approval stands on opaque bedrock, not on
  // the water column — nothing of the dApp or the motif shows through it.
  it('stands the transaction approval on bedrock', async () => {
    const { semantic } = jest.requireActual('../../test-utils/themeTokens');
    render(signed('SIGN_TRANSACTIONS'));

    await waitFor(() => expect(screen.getByTestId('tx-ready').props.children).toBe('ready'));
    const surface = StyleSheet.flatten(screen.getByTestId('mwa-transaction-surface').props.style);
    expect(surface.backgroundColor).toBe(semantic.surface.bedrock);
  });
});

/**
 * The native check gets the origin the sheet shows, normalised in JS, never
 * the raw identity URI: the two parsers then cannot disagree, and the native
 * module parses the URI outside its own error handling, so a string Java
 * rejects could take the approval down. A failed check is unverified.
 */
describe('MwaRequest — what the identity check is given', () => {
  const account = { getReceiveAddress: () => mockAddress } as never;
  beforeEach(() => {
    jest.mocked(verifyCallingPackage).mockReset().mockResolvedValue(true);
  });
  const request = (type: string, identityUri: string) =>
    ({
      __type: type,
      requestId: 'r3',
      chain: 'solana:mainnet',
      appIdentity: { identityUri, identityName: 'Example' },
      authorizationScope: mockToken,
      payloads: [[104, 105]],
    }) as never;

  it.each(['AUTHORIZE_DAPP', 'SIGN_MESSAGES', 'SIGN_TRANSACTIONS'])(
    'checks the normalised origin for %s',
    async (type) => {
      render(
        <MwaRequest
          account={account}
          respond={jest.fn()}
          request={request(type, `${mockOrigin}/app?ref=1`)}
        />
      );
      await waitFor(() => expect(verifyCallingPackage).toHaveBeenCalled());
      expect(verifyCallingPackage).toHaveBeenCalledWith(mockOrigin);
    }
  );

  it('treats a native failure as unverified', async () => {
    jest
      .mocked(verifyCallingPackage)
      .mockReset()
      .mockRejectedValue(new Error('URISyntaxException'));
    render(
      <MwaRequest
        account={account}
        respond={jest.fn()}
        request={request('SIGN_MESSAGES', mockOrigin)}
      />
    );

    await waitFor(() => expect(screen.getByTestId('sheet-hold').props.children).toBe('hold'));
  });
});
