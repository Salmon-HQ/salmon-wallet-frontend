/**
 * @vitest-environment jsdom
 */
/**
 * The Settings screen's two "show me more" handlers, off the screen: flipping
 * Developer Networks off passes the session's current network to
 * `toggleDeveloperNetworks` so it can hop to the mainnet sibling; unverified
 * tokens writes straight through.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useDeveloperModeToggles } from './useDeveloperModeToggles';
import { useAccountsContext } from '../contexts/AccountsContext';
import { useDeveloperModeSettings } from '../contexts/DeveloperModeContext';
import { DEFAULT_TOKEN_LIST_PREFERENCE } from '../utils/tokenListFold';

vi.mock('../contexts/AccountsContext', () => ({ useAccountsContext: vi.fn() }));
vi.mock('../contexts/DeveloperModeContext', () => ({ useDeveloperModeSettings: vi.fn() }));
vi.mock('react-i18next', async () => {
  const i18next = (await import('i18next')).default.createInstance();
  const en = (await import('../locales/en/translation.json')).default;
  await i18next.init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
  return { useTranslation: () => ({ t: i18next.t.bind(i18next) }) };
});

const accountsMock = vi.mocked(useAccountsContext);
const developerModeMock = vi.mocked(useDeveloperModeSettings);

const changeNetwork = vi.fn();
const toggleDeveloperNetworks = vi.fn();
const setShowUnverifiedTokens = vi.fn();
const setBitcoinEnabled = vi.fn(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
  accountsMock.mockReturnValue([
    { networkId: 'solana-devnet' },
    { changeNetwork },
  ] as unknown as ReturnType<typeof useAccountsContext>);
  developerModeMock.mockReturnValue({
    developerNetworks: true,
    showUnverifiedTokens: false,
    toggleDeveloperNetworks,
    setShowUnverifiedTokens,
    tokenListPreference: DEFAULT_TOKEN_LIST_PREFERENCE,
    setTokenListPreference: vi.fn(),
    bitcoinEnabled: true,
    setBitcoinEnabled,
  });
});

describe('useDeveloperModeToggles', () => {
  it('passes the session network and changeNetwork through on toggle', () => {
    const { result } = renderHook(() => useDeveloperModeToggles());

    result.current.handleToggleDeveloperNetworks();

    expect(toggleDeveloperNetworks).toHaveBeenCalledWith({
      activeNetworkId: 'solana-devnet',
      changeNetwork,
    });
  });

  it('writes the unverified-tokens flag straight through', () => {
    const { result } = renderHook(() => useDeveloperModeToggles());

    result.current.handleToggleUnverifiedTokens(true);

    expect(setShowUnverifiedTokens).toHaveBeenCalledWith(true);
  });

  it('passes through the current flags unchanged', () => {
    const { result } = renderHook(() => useDeveloperModeToggles());

    expect(result.current.developerNetworks).toBe(true);
    expect(result.current.showUnverifiedTokens).toBe(false);
  });
});

describe('useDeveloperModeToggles — the Bitcoin switch', () => {
  it('writes on at once and opens nothing', () => {
    const { result } = renderHook(() => useDeveloperModeToggles());

    act(() => result.current.handleToggleBitcoin(true));

    expect(setBitcoinEnabled).toHaveBeenCalledWith(true);
    expect(result.current.bitcoinConfirm.visible).toBe(false);
  });

  it('asks before turning it off, and writes nothing yet', () => {
    const { result } = renderHook(() => useDeveloperModeToggles());

    act(() => result.current.handleToggleBitcoin(false));

    expect(result.current.bitcoinConfirm.visible).toBe(true);
    expect(setBitcoinEnabled).not.toHaveBeenCalled();
  });

  it('cancelling closes the question, writes nothing and leaves Bitcoin on', () => {
    const { result } = renderHook(() => useDeveloperModeToggles());

    act(() => result.current.handleToggleBitcoin(false));
    act(() => result.current.bitcoinConfirm.onClose());

    expect(result.current.bitcoinConfirm.visible).toBe(false);
    expect(setBitcoinEnabled).not.toHaveBeenCalled();
    expect(result.current.bitcoinEnabled).toBe(true);
  });

  // The setter moves the session before it writes (useUserConfig.bitcoin.test.tsx).
  it('confirming hands the setter the session to move off Bitcoin, then closes', async () => {
    accountsMock.mockReturnValue([
      { networkId: 'bitcoin-mainnet' },
      { changeNetwork },
    ] as unknown as ReturnType<typeof useAccountsContext>);
    const { result } = renderHook(() => useDeveloperModeToggles());

    act(() => result.current.handleToggleBitcoin(false));
    await act(async () => {
      await result.current.bitcoinConfirm.onConfirm();
    });

    expect(setBitcoinEnabled).toHaveBeenCalledWith(false, {
      activeNetworkId: 'bitcoin-mainnet',
      changeNetwork,
    });
    expect(result.current.bitcoinConfirm.visible).toBe(false);
  });

  it('says what hiding Bitcoin does, in the translated copy', () => {
    const { result } = renderHook(() => useDeveloperModeToggles());

    expect(result.current.bitcoinConfirm).toMatchObject({
      title: 'Hide Bitcoin?',
      message:
        'Your Bitcoin stays in your wallet. It shows again when you turn Bitcoin back on in Settings.',
      confirmText: 'Hide Bitcoin',
    });
  });
});
