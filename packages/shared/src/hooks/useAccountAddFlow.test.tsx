/**
 * @vitest-environment jsdom
 */
/**
 * The add-account flow's machine, off the screen. What is asserted is the
 * behaviour both panels inherit: a scan that fails is an outage and not an
 * empty list; an invalid seed stays on its step; a lapsed vault key is asked
 * for before any work; a password is verified before the vault is written
 * under it; and a second confirm while the first is in flight is dropped.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useAccountAddFlow, type UseAccountAddFlowOptions } from './useAccountAddFlow';
import { useAccountsContext } from '../contexts/AccountsContext';
import { isVaultKeyCached, EncryptionMaterialMissingError } from '../crypto/encrypt-mnemonics';
import { validateMnemonic } from '../crypto/mnemonic';
import { createAccount } from '../factories/account-factory';
import { getScanNetworks } from '../utils/derived-accounts';

vi.mock('../contexts/AccountsContext', () => ({ useAccountsContext: vi.fn() }));
vi.mock('../crypto/encrypt-mnemonics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../crypto/encrypt-mnemonics')>()),
  isVaultKeyCached: vi.fn(),
}));
vi.mock('../crypto/mnemonic', () => ({
  validateMnemonic: vi.fn(),
  normalizeMnemonic: (phrase: string) => phrase.trim().replace(/\s+/g, ' '),
}));
vi.mock('../factories/account-factory', () => ({
  createAccount: vi.fn(),
  importAccountFromPrivateKey: vi.fn(),
  importWatchOnlyAccount: vi.fn(),
}));
vi.mock('../analytics/client', () => ({ trackEvent: vi.fn() }));
vi.mock('../utils/derived-accounts', () => ({
  getScanNetworks: vi.fn(),
  getScanNetworksWithMirrors: vi.fn().mockResolvedValue(['solana-mainnet']),
  scanDerivedAccounts: vi.fn(),
}));
vi.mock('./useImportPrivateKey', () => ({
  useImportPrivateKey: () => ({
    value: '',
    setValue: vi.fn(),
    error: null,
    address: null,
    privateKey: null,
    validating: false,
    hasInput: false,
    validate: vi.fn(),
    reset: vi.fn(),
    networkId: 'solana-mainnet',
  }),
}));
vi.mock('./useImportWatchOnly', () => ({
  useImportWatchOnly: () => ({
    value: '',
    setValue: vi.fn(),
    error: null,
    address: null,
    hasInput: false,
    validate: vi.fn(),
    reset: vi.fn(),
    networkId: 'solana-mainnet',
  }),
}));

const accountsMock = vi.mocked(useAccountsContext);
const vaultCachedMock = vi.mocked(isVaultKeyCached);
const validateMnemonicMock = vi.mocked(validateMnemonic);
const createMock = vi.mocked(createAccount);
const networksMock = vi.mocked(getScanNetworks);

const addAccount = vi.fn();
const checkPassword = vi.fn();

const activeAccount = {
  id: 'wallet-1',
  secret: { kind: 'mnemonic', mnemonic: 'owner mnemonic' },
};

function options(overrides: Partial<UseAccountAddFlowOptions> = {}): UseAccountAddFlowOptions {
  return {
    defaultName: 'Account 3',
    onBack: vi.fn(),
    onWaitStart: vi.fn(),
    onWaitEnd: vi.fn(),
    onPersisted: vi.fn(),
    onFailure: vi.fn(),
    ...overrides,
  };
}

/** Types a valid seed and moves to the name step. */
async function reachSetName(result: { current: ReturnType<typeof useAccountAddFlow> }) {
  validateMnemonicMock.mockReturnValue(true);
  act(() => result.current.selectImport());
  act(() => result.current.setSeedWords('valid seed phrase'.split(' ')));
  act(() => result.current.submitSeed());
  expect(result.current.step).toBe('set-name');
}

beforeEach(() => {
  vi.clearAllMocks();
  accountsMock.mockReturnValue([
    { accounts: [{ id: 'a1' }, { id: 'a2' }], activeAccount },
    { addAccount, checkPassword },
  ] as unknown as ReturnType<typeof useAccountsContext>);
  vaultCachedMock.mockResolvedValue(true);
  addAccount.mockResolvedValue(undefined);
  checkPassword.mockResolvedValue(true);
  createMock.mockResolvedValue({ account: { id: 'new' } } as never);
  networksMock.mockResolvedValue(['solana-mainnet']);
});

describe('useAccountAddFlow', () => {
  it('reports a scan that threw as an outage, not as an empty list', async () => {
    networksMock.mockRejectedValue(new Error('catalog down'));
    const { result } = renderHook(() => useAccountAddFlow(options()));

    await act(() => result.current.selectDerive());

    expect(result.current.step).toBe('derive-scan');
    expect(result.current.derivedAccounts).toEqual([]);
    expect(result.current.failedNetworks).toEqual(['all']);
    expect(result.current.scanning).toBe(false);
  });

  it('keeps an invalid seed on its step with the error key set', () => {
    validateMnemonicMock.mockReturnValue(false);
    const { result } = renderHook(() => useAccountAddFlow(options()));

    act(() => result.current.selectImport());
    act(() => result.current.setSeedWords('not a seed'.split(' ')));
    act(() => result.current.submitSeed());

    expect(result.current.step).toBe('import-seed');
    expect(result.current.seedError).toBe('wallet.create.invalidSeed');
  });

  it('asks for the password before doing any work when the vault key has lapsed', async () => {
    vaultCachedMock.mockResolvedValue(false);
    const opts = options();
    const { result } = renderHook(() => useAccountAddFlow(opts));
    await reachSetName(result);

    await act(() => result.current.confirm());

    expect(result.current.step).toBe('reauth');
    expect(addAccount).not.toHaveBeenCalled();
    expect(opts.onWaitStart).not.toHaveBeenCalled();
  });

  it('falls back to re-auth when the key lapses between the check and the write', async () => {
    addAccount.mockRejectedValueOnce(new EncryptionMaterialMissingError());
    const opts = options();
    const { result } = renderHook(() => useAccountAddFlow(opts));
    await reachSetName(result);

    await act(() => result.current.confirm());

    expect(result.current.step).toBe('reauth');
    expect(opts.onWaitEnd).toHaveBeenCalledTimes(1);
    expect(opts.onFailure).not.toHaveBeenCalled();
  });

  it('never writes the vault under a password it has not verified', async () => {
    checkPassword.mockResolvedValue(false);
    const opts = options();
    const { result } = renderHook(() => useAccountAddFlow(opts));
    await reachSetName(result);
    vaultCachedMock.mockResolvedValue(false);
    await act(() => result.current.confirm());
    act(() => result.current.setReauthPassword('wrong'));

    await act(() => result.current.confirmReauth());

    expect(result.current.reauthError).toBe('errors.invalid_password');
    expect(addAccount).not.toHaveBeenCalled();
    expect(opts.onWaitStart).not.toHaveBeenCalled();
  });

  it('completes the add with the verified password and forgets it', async () => {
    const opts = options();
    const { result } = renderHook(() => useAccountAddFlow(opts));
    await reachSetName(result);
    vaultCachedMock.mockResolvedValue(false);
    await act(() => result.current.confirm());
    act(() => result.current.setReauthPassword('correct-horse'));

    await act(() => result.current.confirmReauth());

    expect(checkPassword).toHaveBeenCalledWith('correct-horse');
    expect(addAccount).toHaveBeenCalledWith({ id: 'new' }, 'correct-horse');
    expect(opts.onPersisted).toHaveBeenCalledTimes(1);
    expect(result.current.reauthPassword).toBe('');
  });

  it('drops a second confirm while the first is still writing', async () => {
    let release: () => void = () => {};
    addAccount.mockReturnValueOnce(new Promise<void>((resolve) => (release = resolve)));
    const opts = options();
    const { result } = renderHook(() => useAccountAddFlow(opts));
    await reachSetName(result);

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.confirm();
    });
    await waitFor(() => expect(opts.onWaitStart).toHaveBeenCalledTimes(1));
    await act(() => result.current.confirm());
    release();
    await act(() => first);

    expect(addAccount).toHaveBeenCalledTimes(1);
    expect(opts.onPersisted).toHaveBeenCalledTimes(1);
  });

  it('reports any other failure and takes the wait down', async () => {
    addAccount.mockRejectedValueOnce(new Error('disk full'));
    const opts = options();
    const { result } = renderHook(() => useAccountAddFlow(opts));
    await reachSetName(result);

    await act(() => result.current.confirm());

    expect(opts.onWaitEnd).toHaveBeenCalledTimes(1);
    expect(opts.onFailure).toHaveBeenCalledWith(expect.any(Error));
    expect(opts.onPersisted).not.toHaveBeenCalled();
  });

  it('walks back one step at a time, and leaves the panel from the first', () => {
    const opts = options();
    const { result } = renderHook(() => useAccountAddFlow(opts));

    act(() => result.current.selectImport());
    expect(result.current.step).toBe('import-seed');
    act(() => result.current.stepBack());
    expect(result.current.step).toBe('select-method');
    act(() => result.current.stepBack());
    expect(opts.onBack).toHaveBeenCalledTimes(1);
  });
});
