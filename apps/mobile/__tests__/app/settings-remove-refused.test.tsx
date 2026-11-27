/**
 * Removing a wallet that storage refuses to change shows one dialog with a way
 * out: close, or the lock screen's two-step reset, each sheet opening once the
 * one before it has left. Any other failure keeps today's alert.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));
jest.mock('react-native-safe-area-context', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(RNView, props, children),
  };
});

let mockThemePreference: 'system' | 'light' | 'dark' = 'system';
const mockChangeNetwork = jest.fn(async (_id: string) => {});
const mockToggleDeveloperNetworks = jest.fn(async (_options?: unknown) => {});
const mockSetShowUnverifiedTokens = jest.fn(async (_show: boolean) => {});
const developerModeState = { developerNetworks: false, showUnverifiedTokens: false };
const mockRemoveAllAccounts = jest.fn(async () => {});
const mockDisarm = jest.fn(async () => {});
const mockRemove = jest.fn();

jest.mock('@salmon/shared', () =>
  require('../../test-utils/sharedWith').sharedWith({
    // Removing a wallet asks the vault for key material; the screen only decides
    // whether the confirmation shows a password field.
    useAccountRemoval: () => ({
      requiresPassword: false,
      validatePassword: jest.fn(),
      remove: mockRemove,
    }),
    // The devnet-to-mainnet passage is `useDeveloperModeToggles`'s own concern
    // (tested there); this fakes it wired to the same two spies so the row's
    // wiring is still checked here.
    useDeveloperModeToggles: () => ({
      developerNetworks: developerModeState.developerNetworks,
      showUnverifiedTokens: developerModeState.showUnverifiedTokens,
      handleToggleDeveloperNetworks: () => {
        void mockToggleDeveloperNetworks({
          activeNetworkId: 'solana-devnet',
          changeNetwork: mockChangeNetwork,
        });
      },
      handleToggleUnverifiedTokens: (show: boolean) => {
        void mockSetShowUnverifiedTokens(show);
      },
    }),
    fontFamilyNative: { regular: 'System', bold: 'System' },
    fontSize: { body: 15 },
    s: (value: number) => value,
    vs: (value: number) => value,
    spacing: { screenGutter: 20, xl: 20 },
    semantic: {
      text: { secondary: '#A7B1C4', tertiary: '#8B96AD' },
      status: { danger: '#FF6B85', dangerTint: '#3A1420' },
      border: { default: '#58637B' },
      accent: { ink: '#FF5C45' },
    },
    getSettingsItemTestId: (id: string) => `settings-item-${id}`,
    // The real table: the screen is one rendering of it, so the rows under test
    // are the rows that ship.
    ...jest.requireActual('../../../../packages/shared/src/settings/registry'),
    useAccountsContext: () => [
      {
        activeAccount: { id: 'wallet-2' },
        activeBlockchainAccount: null,
        networkId: 'solana-devnet',
        accounts: [{ id: 'wallet-1' }, { id: 'wallet-2' }],
      },
      {
        removeAllAccounts: mockRemoveAllAccounts,
        removeAccount: jest.fn(),
        changeNetwork: mockChangeNetwork,
      },
    ],
    useAnalyticsConsent: () => ({ consent: false, setConsent: jest.fn() }),
    useCurrencyContext: () => [{ currency: 'usd' }],
    // The Token list row's value has its own test (settings-token-list-row).
    useTokenListLabels: () => ({ rowValue: 'All' }),
    useUserConfig: () => ({
      developerNetworks: false,
      toggleDeveloperNetworks: jest.fn(),
      explorer: { name: 'Solscan' },
    }),
    useTheme: () => ({ preference: mockThemePreference }),
  })
);

jest.mock('../../src/icons', () => {
  const { View } = require('react-native');
  const Stub = () => <View />;
  return new Proxy(
    { iconSize: { sm: 16, md: 20, lg: 24, xl: 28 } },
    {
      get: (target, prop) =>
        prop in target ? (target as Record<string, unknown>)[prop as string] : Stub,
    }
  );
});

jest.mock('../../src/components/ConfirmSheet', () => ({
  ConfirmSheet: jest.requireActual('../../test-utils/confirmSheetStandIn').ConfirmSheetStandIn,
}));

jest.mock('../../src/components', () => {
  const { View, Text } = require('react-native');
  return {
    ConfirmSheet: jest.requireActual('../../test-utils/confirmSheetStandIn').ConfirmSheetStandIn,
    VaultRefusedDialog: jest.requireActual('../../src/components/ResetConfirm').VaultRefusedDialog,
    DepthBackground: () => null,
    ScalesBackground: () => null,
    SectionLabel: ({ children }: { children?: React.ReactNode }) => <Text>{children}</Text>,
    ScreenHeader: ({ title }: { title?: string }) => <Text>{title}</Text>,
    IconBubble: () => <View />,
    ListRow: ({
      testID,
      title,
      trailing,
    }: {
      testID?: string;
      title?: string;
      trailing?: React.ReactNode;
    }) => (
      <View testID={testID}>
        <Text>{title}</Text>
        {trailing}
      </View>
    ),
  };
});

jest.mock('../../src/i18n', () => ({
  useLanguage: () => ({ currentLanguage: 'en' }),
}));
jest.mock('../../src/contexts/BiometricContext', () => ({
  useBiometric: () => ({ disarm: mockDisarm }),
}));

import { finishClosing } from '../../test-utils/confirmSheetStandIn';
import SettingsScreenIndex from '../../app/(app)/settings/index';

const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));
const leave = () => act(() => finishClosing());

/** Presses `testID`; `next` shows only once the pressed sheet has left. */
async function pressThenLeave(testID: string, next: string) {
  await press(testID);
  expect(screen.queryByText(next)).toBeNull();
  await leave();
  expect(screen.getByText(next)).toBeTruthy();
}

async function refuse() {
  const { VaultReadRefusedError } = jest.requireActual('@salmon/shared');
  mockRemove.mockRejectedValue(
    new VaultReadRefusedError('The stored wallet list reads empty while wallets are open')
  );
  render(<SettingsScreenIndex />);
  fireEvent.press(screen.getByTestId('settings-item-removeWallet'));
  await pressThenLeave('confirm-dialog-confirm', 'lock.vault_refused_title');
}

describe('Settings — a refused wallet removal', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows the refusal in place of the removal sheet and the alert', async () => {
    await refuse();
    expect(screen.queryByText('settings.remove_wallet_title')).toBeNull();
    expect(alert).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('closes on close and erases nothing', async () => {
    await refuse();
    await press('vault-refused-close-button');
    await leave();

    expect(screen.queryByText('lock.vault_refused_title')).toBeNull();
    expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
    expect(mockDisarm).not.toHaveBeenCalled();
  });

  it('resets Salmon after both reset sheets, once, as the lock screen does', async () => {
    await refuse();
    await pressThenLeave('vault-refused-reset-button', 'lock.reset_wallet_title');
    await pressThenLeave('confirm-dialog-confirm', 'lock.confirm_title');
    expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
    await press('confirm-dialog-confirm');

    expect(mockDisarm).toHaveBeenCalledTimes(1);
    expect(mockRemoveAllAccounts).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)');
  });

  it.each([1, 2])('erases nothing when the reset is cancelled at step %i', async (step) => {
    await refuse();
    await pressThenLeave('vault-refused-reset-button', 'lock.reset_wallet_title');
    if (step === 2) await pressThenLeave('confirm-dialog-confirm', 'lock.confirm_title');
    await press('confirm-dialog-cancel');
    await leave();

    expect(screen.queryByText('lock.reset_wallet_title')).toBeNull();
    expect(screen.queryByText('lock.confirm_title')).toBeNull();
    expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
  });

  it('keeps the alert and shows no dialog for any other failure', async () => {
    mockRemove.mockRejectedValue(new Error('disk full'));
    render(<SettingsScreenIndex />);
    fireEvent.press(screen.getByTestId('settings-item-removeWallet'));
    await press('confirm-dialog-confirm');

    expect(alert).toHaveBeenCalledWith('general.error', 'settings.remove_wallet_error');
    expect(screen.queryByText('lock.vault_refused_title')).toBeNull();
  });
});
