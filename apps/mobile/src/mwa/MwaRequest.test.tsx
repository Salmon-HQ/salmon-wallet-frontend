/**
 * dApp events from Mobile Wallet Adapter (spec 042, FR-011–FR-013): one
 * prop-less event per request the user approved and the wallet answered, read
 * where it leaves the app; nothing for a decline, a closed sheet, a failed
 * signature or a refusal on Seed Vault's own screen.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import {
  startTestAnalytics,
  type SentEvent,
} from '../../../../packages/shared/src/test-utils/analytics';

jest.mock('@solana-mobile/mobile-wallet-adapter-walletlib', () => ({
  __esModule: true,
  MWARequestFailReason: { UserDeclined: 'USER_DECLINED', InvalidSignatures: 'INVALID_SIGNATURES' },
  MWARequestType: {
    AuthorizeDappRequest: 'AUTHORIZE_DAPP',
    ReauthorizeDappRequest: 'REAUTHORIZE_DAPP',
    DeauthorizeDappRequest: 'DEAUTHORIZE_DAPP',
    SignMessagesRequest: 'SIGN_MESSAGES',
    SignTransactionsRequest: 'SIGN_TRANSACTIONS',
    SignAndSendTransactionsRequest: 'SIGN_AND_SEND_TRANSACTIONS',
  },
  verifyCallingPackage: jest.fn().mockResolvedValue(true),
}));

const mockAddTrustedApp = jest.fn();
const mockSignIn = jest.fn();
const mockSignMessages = jest.fn();
const mockSignTransactions = jest.fn();
const mockSignAndSend = jest.fn();

// The barrel drags the Solana stack in: the real analytics client, and the
// signers and wallet state as stand-ins.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../../packages/shared/src/analytics'),
  mwaPrecheck: () => ({ ok: true, origin: 'https://dapp.example' }),
  useAccountsContext: () => [
    { networkId: 'solana-mainnet', activeTrustedApps: [], activeAccount: { name: 'Main' } },
    { addTrustedApp: mockAddTrustedApp, removeTrustedApp: jest.fn() },
  ],
  mwaDisplayName: () => 'Example',
  mwaIconUrl: () => undefined,
  getShortAddress: (address: string) => address,
  newMwaAuthToken: () => new Uint8Array([7]),
  encodeMwaAuthToken: () => 'token',
  mwaAuthorizedAccount: (address: string) => ({ address }),
  mwaSignIn: (...args: unknown[]) => mockSignIn(...args),
  mwaSignMessages: (...args: unknown[]) => mockSignMessages(...args),
  mwaSignTransactions: (...args: unknown[]) => mockSignTransactions(...args),
  mwaSignAndSend: (...args: unknown[]) => mockSignAndSend(...args),
  decodeDAppMessage: () => ({ text: 'Hello' }),
  isSeedVaultError: (error: unknown) => (error as { seedVault?: boolean }).seedVault === true,
  toSignAllTransactionsRequest: () => ({ method: 'signAllTransactions' }),
  useSolanaTransactionApproval: () => ({
    feeSol: null,
    parsingError: null,
    effects: null,
    effectsLoading: false,
    details: null,
  }),
  dappTransactionDisplay: () => ({}),
  dappTransactionGate: () => ({ canApprove: true, requiresHold: false }),
  spacing: { lg: 16 },
}));

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../components/DepthBackground', () => ({ DepthBackground: () => null }));
jest.mock('../components/ConfirmSheet', () => {
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    ConfirmSheet: ({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) => (
      <View>
        <TouchableOpacity onPress={onConfirm}>
          <Text>confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text>close</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});
jest.mock('../components/TransactionConfirmation', () => {
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    TransactionConfirmation: ({
      onConfirm,
      onBack,
      error,
    }: {
      onConfirm: () => void;
      onBack: () => void;
      error: string | null;
    }) => (
      <View>
        <TouchableOpacity onPress={onConfirm}>
          <Text>confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack}>
          <Text>close</Text>
        </TouchableOpacity>
        {error ? <Text>{`error:${error}`}</Text> : null}
      </View>
    ),
  };
});

import { getAnalytics } from '@salmon/shared';
import type { MWARequest } from '@solana-mobile/mobile-wallet-adapter-walletlib';

import { MwaRequest } from './MwaRequest';

const account = { getReceiveAddress: () => 'Addr1' } as never;
const identity = { identityUri: 'https://dapp.example', identityName: 'Example' };
const base = { requestId: 'r1', sessionId: 's', chain: 'solana:mainnet', appIdentity: identity };

const authorize = (extra: object = {}) =>
  ({ __type: 'AUTHORIZE_DAPP', ...base, ...extra }) as unknown as MWARequest;
const signMessages = {
  __type: 'SIGN_MESSAGES',
  ...base,
  authorizationScope: [1],
  payloads: [[72, 105]],
} as unknown as MWARequest;
const signTransactions = {
  __type: 'SIGN_TRANSACTIONS',
  ...base,
  authorizationScope: [1],
  payloads: [[1, 2, 3]],
} as unknown as MWARequest;
const signAndSend = {
  __type: 'SIGN_AND_SEND_TRANSACTIONS',
  ...base,
  authorizationScope: [1],
  payloads: [[1, 2, 3]],
} as unknown as MWARequest;

const seedVaultRefusal = () =>
  Object.assign(new Error('cancelled'), { seedVault: true, reason: 'cancelled' });

let analytics: Awaited<ReturnType<typeof startTestAnalytics>>;
/** What had been recorded each time the dApp got an answer. */
let atRespond: SentEvent[][];
const respond = jest.fn(() => {
  // A flush hands the queue to the transport before its first await.
  void getAnalytics()?.flush();
  atRespond.push(analytics.delivered());
});

beforeEach(async () => {
  jest.clearAllMocks();
  analytics = await startTestAnalytics();
  atRespond = [];
});

function show(request: MWARequest) {
  return render(<MwaRequest request={request} respond={respond} account={account} />);
}

async function approve(request: MWARequest) {
  const screen = show(request);
  fireEvent.press(screen.getByText('confirm'));
  await waitFor(() => expect(respond).toHaveBeenCalled());
}

describe('approved requests', () => {
  it('counts a connection once, before the answer, with no props', async () => {
    mockAddTrustedApp.mockResolvedValue(undefined);

    await approve(authorize());

    expect(respond).toHaveBeenCalledWith(
      expect.objectContaining({ accounts: [{ address: 'Addr1' }] })
    );
    expect(atRespond).toEqual([[{ event: 'dapp_connected', props: {} }]]);
    expect(await analytics.sent()).toEqual([{ event: 'dapp_connected', props: {} }]);
  });

  it('still answers an approved connection when tracking throws', async () => {
    mockAddTrustedApp.mockResolvedValue(undefined);
    const shared = jest.requireMock('@salmon/shared');
    const spy = jest.spyOn(shared, 'trackEvent').mockImplementation(() => {
      throw new Error('analytics broke');
    });

    await approve(authorize());

    expect(respond).toHaveBeenCalledWith(
      expect.objectContaining({ accounts: [{ address: 'Addr1' }] })
    );
    spy.mockRestore();
  });

  it('counts a sign-in connection as a connection', async () => {
    mockAddTrustedApp.mockResolvedValue(undefined);
    mockSignIn.mockResolvedValue({ signature: 'sig' });

    await approve(authorize({ signInPayload: { domain: 'dapp.example' } }));

    expect(respond).toHaveBeenCalledWith(
      expect.objectContaining({ signInResult: { signature: 'sig' } })
    );
    expect(atRespond).toEqual([[{ event: 'dapp_connected', props: {} }]]);
    expect(await analytics.sent()).toEqual([{ event: 'dapp_connected', props: {} }]);
  });

  it('counts signed messages once, before the answer', async () => {
    mockSignMessages.mockResolvedValue([new Uint8Array([1])]);

    await approve(signMessages);

    expect(respond).toHaveBeenCalledWith({ signedPayloads: [new Uint8Array([1])] });
    expect(atRespond).toEqual([[{ event: 'dapp_message_signed', props: {} }]]);
    expect(await analytics.sent()).toEqual([{ event: 'dapp_message_signed', props: {} }]);
  });

  it('counts signed transactions once, before the answer', async () => {
    mockSignTransactions.mockResolvedValue([new Uint8Array([1]), new Uint8Array([2])]);

    await approve(signTransactions);

    expect(atRespond).toEqual([[{ event: 'dapp_transaction_signed', props: {} }]]);
    expect(await analytics.sent()).toEqual([{ event: 'dapp_transaction_signed', props: {} }]);
  });

  it('counts sent transactions once, before the answer', async () => {
    mockSignAndSend.mockResolvedValue({ signatures: [new Uint8Array([1])] });

    await approve(signAndSend);

    expect(respond).toHaveBeenCalledWith({ signedTransactions: [new Uint8Array([1])] });
    expect(atRespond).toEqual([[{ event: 'dapp_transaction_signed', props: {} }]]);
    expect(await analytics.sent()).toEqual([{ event: 'dapp_transaction_signed', props: {} }]);
  });
});

describe('requests that record nothing', () => {
  it.each([
    ['connection', authorize()],
    ['message', signMessages],
    ['transaction', signTransactions],
    ['sign and send', signAndSend],
  ])('a declined %s or a closed sheet', async (_, request) => {
    fireEvent.press(show(request).getByText('close'));

    expect(respond).toHaveBeenCalledWith({ failReason: 'USER_DECLINED' });
    expect(await analytics.sent()).toEqual([]);
  });

  it('a connection that could not be saved', async () => {
    mockAddTrustedApp.mockRejectedValue(new Error('storage'));

    await approve(authorize());

    expect(respond).toHaveBeenCalledWith({ failReason: 'USER_DECLINED' });
    expect(await analytics.sent()).toEqual([]);
  });

  it.each([
    ['a failed', new Error('rpc'), { failReason: 'INVALID_SIGNATURES', valid: [false] }],
    ['a Seed Vault refused', seedVaultRefusal(), { failReason: 'USER_DECLINED' }],
  ])('%s message signature', async (_, error, answer) => {
    mockSignMessages.mockRejectedValue(error);

    await approve(signMessages);

    expect(respond).toHaveBeenCalledWith(answer);
    expect(await analytics.sent()).toEqual([]);
  });

  it('a Seed Vault refused transaction', async () => {
    mockSignTransactions.mockRejectedValue(seedVaultRefusal());

    await approve(signTransactions);

    expect(respond).toHaveBeenCalledWith({ failReason: 'USER_DECLINED' });
    expect(await analytics.sent()).toEqual([]);
  });

  it('a failed transaction signature, shown on the screen and not answered', async () => {
    mockSignTransactions.mockRejectedValue(new Error('rpc'));

    const screen = show(signTransactions);
    fireEvent.press(screen.getByText('confirm'));
    await screen.findByText('error:rpc');

    expect(respond).not.toHaveBeenCalled();
    expect(await analytics.sent()).toEqual([]);
  });

  it('a send the network partly refused', async () => {
    mockSignAndSend.mockResolvedValue({ valid: [false] });

    await approve(signAndSend);

    expect(respond).toHaveBeenCalledWith({ failReason: 'INVALID_SIGNATURES', valid: [false] });
    expect(await analytics.sent()).toEqual([]);
  });
});
