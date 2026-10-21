import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { MwaHost } from './MwaRoot';

const mockRespond = jest.fn();
const mockChangeNetwork = jest.fn().mockResolvedValue(undefined);
const mockClearSwitchingNetwork = jest.fn();
const mockLockAccounts = jest.fn().mockResolvedValue(undefined);
const mockSession: { current: unknown } = { current: null };
const mockState: Record<string, unknown> = {};
const mockVerification = { current: 'verified' };

// `@solana/kit` is ESM Jest cannot load; the MWA helpers only use it inside
// the signing functions, which this host never reaches.
jest.mock('@solana/kit', () => ({}));
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/utils/mwa'),
  ...jest.requireActual('@salmon/shared/src/utils/active-selection'),
  isSignableSolanaAccount: () => true,
  useAccountsContext: () => [
    mockState,
    {
      changeNetwork: mockChangeNetwork,
      clearSwitchingNetwork: mockClearSwitchingNetwork,
      lockAccounts: mockLockAccounts,
      unlockAccounts: jest.fn(),
    },
  ],
}));

jest.mock('@solana-mobile/mobile-wallet-adapter-walletlib', () => ({
  __esModule: true,
  MWARequestFailReason: { UserDeclined: 'USER_DECLINED' },
  MWARequestType: {
    AuthorizeDappRequest: 'AUTHORIZE_DAPP',
    DeauthorizeDappRequest: 'DEAUTHORIZE_DAPP',
    SignMessagesRequest: 'SIGN_MESSAGES',
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: unknown) =>
      typeof options === 'object' && options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}));

jest.mock('./useMwaSession', () => ({
  useMwaSession: () => ({ current: mockSession.current, respond: mockRespond }),
}));

jest.mock('./MwaRequest', () => ({
  MwaRequest: ({ request }: { request: { requestId: string } }) => {
    const { Text: MockText } = jest.requireActual('react-native');
    return <MockText>{`request ${request.requestId}`}</MockText>;
  },
  useIdentityVerification: () => mockVerification.current,
}));

// The sheet is the kit's; what is under test is which one the host shows and
// what each choice tells the dApp. `onClose` runs after `onConfirm`, as the
// real sheet does.
jest.mock('../components/ConfirmSheet', () => ({
  ConfirmSheet: (props: {
    title: string;
    message: string;
    confirmText?: string;
    requiresHold?: boolean;
    onConfirm: () => Promise<void> | void;
    onClose: () => void;
  }) => {
    const { Pressable: P, Text: T, View: V } = jest.requireActual('react-native');
    return (
      <V>
        <T>{props.title}</T>
        <T>{props.message}</T>
        <P
          testID="sheet-confirm"
          onPress={async () => {
            await props.onConfirm();
            props.onClose();
          }}
        >
          <T>{props.confirmText}</T>
        </P>
        <P testID="sheet-cancel" onPress={props.onClose} />
        <T testID="sheet-hold">{props.requiresHold ? 'hold' : 'tap'}</T>
      </V>
    );
  },
}));

// MwaRoot's own providers are not under test; MwaHost is rendered bare.
jest.mock('../i18n', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../providers/AppProviders', () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => children,
  useAppFonts: () => [true, null],
}));
jest.mock('../components/LockOverlay', () => ({ LockContent: () => null }));
jest.mock('../components/DepthBackground', () => ({ DepthBackground: () => null }));
jest.mock('../contexts/BiometricContext', () => ({ useBiometric: () => ({}) }));
jest.mock('../seed-vault/bridge', () => ({
  isSeedVaultScreenOpen: () => false,
  onSeedVaultScreensClosed: () => () => undefined,
  SEED_VAULT_CLOSE_SETTLE_MS: 0,
}));

const ADDRESS = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';
const walletOn = (networkId: string, held: string[] = ['solana-mainnet', 'solana-devnet']) => ({
  ready: true,
  locked: false,
  networkId,
  accounts: [{ id: 'a' }],
  activeAccount: {
    name: 'Main',
    networksAccounts: Object.fromEntries(held.map((id) => [id, [{ address: ADDRESS }]])),
  },
  activeBlockchainAccount: { getReceiveAddress: () => ADDRESS },
  activeTrustedApps: {},
});
const connect = (chain: string) => ({
  __type: 'AUTHORIZE_DAPP',
  requestId: 'r1',
  chain,
  appIdentity: { identityName: 'Playground', identityUri: 'https://dapp.example' },
});

function given(state: Record<string, unknown>, request: unknown) {
  for (const key of Object.keys(mockState)) delete mockState[key];
  Object.assign(mockState, state);
  mockSession.current = request;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVerification.current = 'verified';
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

describe('MwaHost — a devnet dApp on a mainnet wallet', () => {
  it('offers to switch, naming both networks, instead of refusing', () => {
    given(walletOn('solana-mainnet'), connect('solana:devnet'));
    render(<MwaHost />);

    expect(screen.getByText('dapp.mwa_switch_title')).toBeTruthy();
    expect(screen.getByText(/dapp\.mwa_switch_message/).props.children).toContain(
      '"target":"dapp.mwa_network_names.solana-devnet"'
    );
    expect(screen.queryByText('request r1')).toBeNull();
  });

  it('switches through the same action Settings uses, and answers nothing yet', async () => {
    given(walletOn('solana-mainnet'), connect('solana:devnet'));
    render(<MwaHost />);

    await act(async () => fireEvent.press(screen.getByTestId('sheet-confirm')));

    expect(mockChangeNetwork).toHaveBeenCalledWith('solana-devnet');
    expect(mockClearSwitchingNetwork).toHaveBeenCalled();
    expect(mockRespond).not.toHaveBeenCalled();
  });

  it('declines once and stays put when the user cancels', () => {
    given(walletOn('solana-mainnet'), connect('solana:devnet'));
    render(<MwaHost />);

    fireEvent.press(screen.getByTestId('sheet-cancel'));

    expect(mockRespond).toHaveBeenCalledTimes(1);
    expect(mockRespond).toHaveBeenCalledWith({ failReason: 'USER_DECLINED' });
    expect(mockChangeNetwork).not.toHaveBeenCalled();
  });

  it('offers no switch to a dApp that does not say who it is', () => {
    given(walletOn('solana-mainnet'), {
      ...connect('solana:devnet'),
      appIdentity: { identityName: 'Salmon Support' },
    });
    render(<MwaHost />);

    expect(screen.queryByText('dapp.mwa_switch_title')).toBeNull();
    expect(mockChangeNetwork).not.toHaveBeenCalled();
  });

  it('offers no switch for a signing request', () => {
    given(walletOn('solana-mainnet'), { ...connect('solana:devnet'), __type: 'SIGN_MESSAGES' });
    render(<MwaHost />);

    expect(screen.queryByText('dapp.mwa_switch_title')).toBeNull();
  });

  // A switch that fails must still answer the dApp, and the user, who asked
  // for it, hears why before the dApp hears no.
  it('says the switch failed, then declines once', async () => {
    mockChangeNetwork.mockRejectedValueOnce(new Error('storage'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    given(walletOn('solana-mainnet'), connect('solana:devnet'));
    render(<MwaHost />);

    await act(async () => fireEvent.press(screen.getByTestId('sheet-confirm')));
    expect(mockRespond).not.toHaveBeenCalled();
    expect(screen.getByText('dapp.mwa_refused_title')).toBeTruthy();
    expect(screen.getByText(/dapp\.mwa_switch_failed/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('sheet-confirm'));
    expect(mockRespond).toHaveBeenCalledTimes(1);
    expect(mockRespond).toHaveBeenCalledWith({ failReason: 'USER_DECLINED' });
  });

  // The name is the dApp's own claim; the switch holds for the whole app.
  it('puts the origin first, as a claim and held when it cannot confirm who is asking', () => {
    mockVerification.current = 'unverified';
    given(walletOn('solana-mainnet'), connect('solana:devnet'));
    render(<MwaHost />);

    const message = screen.getByText(/dapp\.mwa_switch_message/).props.children as string;
    expect(message.split('\n\n')[0]).toBe(
      'dapp.mwa_unverified_origin {"origin":"https://dapp.example"}'
    );
    expect(message).toContain('dapp.mwa_unverified {');
    expect(screen.getByTestId('sheet-hold').props.children).toBe('hold');
  });

  it("keeps a verified dApp's switch a plain tap under the site", () => {
    given(walletOn('solana-mainnet'), connect('solana:devnet'));
    render(<MwaHost />);

    const message = screen.getByText(/dapp\.mwa_switch_message/).props.children as string;
    expect(message.split('\n\n')[0]).toBe('https://dapp.example');
    expect(screen.getByTestId('sheet-hold').props.children).toBe('tap');
  });

  it('shows the request itself once the wallet is on the network asked for', () => {
    given(walletOn('solana-devnet'), connect('solana:devnet'));
    render(<MwaHost />);

    expect(screen.getByText('request r1')).toBeTruthy();
  });

  it('does not offer a network the active account holds nothing on', () => {
    given(walletOn('solana-mainnet', ['solana-mainnet']), connect('solana:devnet'));
    render(<MwaHost />);

    expect(screen.queryByText('dapp.mwa_switch_title')).toBeNull();
    expect(screen.getByText('request r1')).toBeTruthy();
  });

  it('never asks to switch for a disconnect', () => {
    given(walletOn('solana-mainnet'), { ...connect('solana:devnet'), __type: 'DEAUTHORIZE_DAPP' });
    render(<MwaHost />);

    expect(screen.queryByText('dapp.mwa_switch_title')).toBeNull();
  });
});

describe('MwaHost — no wallet yet', () => {
  const noWallet = { ready: true, locked: false, networkId: null, accounts: [] };

  it('says so before anything about networks, whatever the dApp asks for', () => {
    given(noWallet, connect('solana:mainnet'));
    render(<MwaHost />);

    expect(screen.getByText('dapp.mwa_no_wallet_title')).toBeTruthy();
    expect(screen.queryByText('dapp.mwa_switch_title')).toBeNull();
    expect(screen.queryByText('request r1')).toBeNull();
  });

  it('opens Salmon, then declines once and closes back', async () => {
    given(noWallet, connect('solana:devnet'));
    render(<MwaHost />);

    await act(async () => fireEvent.press(screen.getByTestId('sheet-confirm')));

    expect(Linking.openURL).toHaveBeenCalledWith('salmonwallet://');
    expect(mockRespond).toHaveBeenCalledTimes(1);
    expect(mockRespond).toHaveBeenCalledWith({ failReason: 'USER_DECLINED' });
    expect(mockLockAccounts).toHaveBeenCalled();
  });

  it('declines once when the user closes it', () => {
    given(noWallet, connect('solana:mainnet'));
    render(<MwaHost />);

    fireEvent.press(screen.getByTestId('sheet-cancel'));

    expect(mockRespond).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('waits quietly while no request has arrived', () => {
    given(noWallet, null);
    render(<MwaHost />);

    expect(screen.queryByText('dapp.mwa_no_wallet_title')).toBeNull();
  });
});
