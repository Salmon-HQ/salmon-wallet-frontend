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
import { renderHook } from '@testing-library/react';

import { useDeveloperModeToggles } from './useDeveloperModeToggles';
import { useAccountsContext } from '../contexts/AccountsContext';
import { useDeveloperModeSettings } from '../contexts/DeveloperModeContext';

vi.mock('../contexts/AccountsContext', () => ({ useAccountsContext: vi.fn() }));
vi.mock('../contexts/DeveloperModeContext', () => ({ useDeveloperModeSettings: vi.fn() }));

const accountsMock = vi.mocked(useAccountsContext);
const developerModeMock = vi.mocked(useDeveloperModeSettings);

const changeNetwork = vi.fn();
const toggleDeveloperNetworks = vi.fn();
const setShowUnverifiedTokens = vi.fn();

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
