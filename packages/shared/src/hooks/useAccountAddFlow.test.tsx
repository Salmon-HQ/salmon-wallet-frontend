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
import { createAccount, importSeedVaultAccount } from '../factories/account-factory';
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
  importSeedVaultAccount: vi.fn(),
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
const removeAccount = vi.fn();
const checkPassword = vi.fn();
const importSeedVaultMock = vi.mocked(importSeedVaultAccount);

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
    { addAccount, removeAccount, checkPassword, getNetworkId: () => 'solana-devnet' },
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

  it('offers Continue only once the grid holds a phrase that checks out', () => {
    validateMnemonicMock.mockImplementation((value: string) => value === 'valid seed phrase');
    const { result } = renderHook(() => useAccountAddFlow(options()));

    act(() => result.current.selectImport());
    expect(result.current.seedValid).toBe(false);
    expect(result.current.seedError).toBe('');

    act(() => result.current.setSeedWords('valid seed phrase'.split(' ')));
    expect(result.current.seedValid).toBe(true);
  });

  it('says a full grid is invalid without waiting for a Continue it does not offer', () => {
    validateMnemonicMock.mockReturnValue(false);
    const { result } = renderHook(() => useAccountAddFlow(options()));

    act(() => result.current.selectImport());
    act(() => result.current.setSeedWords(Array<string>(12).fill('word')));

    expect(result.current.seedValid).toBe(false);
    expect(result.current.seedError).toBe('wallet.create.invalidSeed');
  });

  it('fills the grid from a paste, and reports a paste that does not fit', () => {
    validateMnemonicMock.mockReturnValue(false);
    const { result } = renderHook(() => useAccountAddFlow(options()));

    act(() => result.current.selectImport());
    act(() => result.current.pasteSeed(Array<string>(12).fill('w').join(' ')));
    expect(result.current.seedWords).toEqual(Array<string>(12).fill('w'));
    expect(result.current.pastedCount).toBeNull();

    act(() => result.current.pasteSeed(Array<string>(13).fill('w').join(' ')));
    expect(result.current.pastedCount).toBe(13);
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

describe('useAccountAddFlow — Seed Vault', () => {
  const listed = [
    {
      authToken: '7',
      derivationPath: "bip32:/m/44'/501'/0'/0'",
      address: 'AddrA',
      name: 'Main',
      isUserWallet: true,
    },
    {
      authToken: '7',
      derivationPath: "bip32:/m/44'/501'/1'/0'",
      address: 'AddrB',
      name: 'AddrB',
      isUserWallet: false,
    },
  ];
  const access = () => ({
    listAccounts: vi.fn().mockResolvedValue(listed),
    authorizeAnother: vi.fn().mockResolvedValue(undefined),
    createSeed: vi.fn().mockResolvedValue(undefined),
    importSeed: vi.fn().mockResolvedValue(undefined),
  });
  const withWallets = (wallets: unknown[]) =>
    accountsMock.mockReturnValue([
      { accounts: wallets, activeAccount },
      { addAccount, removeAccount, checkPassword, getNetworkId: () => 'solana-devnet' },
    ] as unknown as ReturnType<typeof useAccountsContext>);

  beforeEach(() => {
    importSeedVaultMock.mockResolvedValue({ account: { id: 'sv' } } as never);
  });

  it("lists the authorized seeds' accounts and marks one already in Salmon", async () => {
    withWallets([{ id: 'w', secret: { kind: 'seedVault', authToken: '7', address: 'AddrA' } }]);
    const seedVault = access();
    const { result } = renderHook(() => useAccountAddFlow(options({ seedVault })));

    await act(() => result.current.selectSeedVault());

    expect(result.current.step).toBe('import-seed-vault');
    expect(result.current.seedVaultAccounts.map((a) => [a.address, a.added])).toEqual([
      ['AddrA', true],
      ['AddrB', false],
    ]);
  });

  it('adds the chosen account as a Seed Vault wallet on the selected Solana network', async () => {
    withWallets([]);
    const { result } = renderHook(() => useAccountAddFlow(options({ seedVault: access() })));
    await act(() => result.current.selectSeedVault());

    act(() => result.current.toggleSeedVault(result.current.seedVaultAccounts[1]!));
    act(() => result.current.continueSeedVault());
    expect(result.current.step).toBe('set-name');
    await act(() => result.current.confirm());

    expect(importSeedVaultMock).toHaveBeenCalledWith({
      name: 'Account 3',
      authToken: '7',
      derivationPath: "bip32:/m/44'/501'/1'/0'",
      address: 'AddrB',
      networkId: 'solana-devnet',
    });
    expect(addAccount).toHaveBeenCalledWith({ id: 'sv' }, undefined);
    expect(removeAccount).not.toHaveBeenCalled();
  });

  it('reconnects a wallet whose Seed Vault access was revoked instead of duplicating it', async () => {
    withWallets([{ id: 'old', secret: { kind: 'seedVault', authToken: '3', address: 'AddrA' } }]);
    const { result } = renderHook(() => useAccountAddFlow(options({ seedVault: access() })));
    await act(() => result.current.selectSeedVault());
    expect(result.current.seedVaultAccounts[0]!.added).toBe(false);

    act(() => result.current.toggleSeedVault(result.current.seedVaultAccounts[0]!));
    act(() => result.current.continueSeedVault());
    await act(() => result.current.confirm());

    expect(removeAccount).toHaveBeenCalledWith('old', undefined);
    expect(addAccount).toHaveBeenCalledWith({ id: 'sv' }, undefined);
  });

  it("shows the seed's own wallets and the first few paths, not every path derived ahead of time", async () => {
    withWallets([]);
    const deep = (i: number) => ({
      authToken: '7',
      derivationPath: `bip32:/m/44'/501'/${i}'/0'`,
      address: `Deep${i}`,
      name: `Deep${i}`,
      isUserWallet: i === 40,
    });
    const seedVault = access();
    seedVault.listAccounts.mockResolvedValue(Array.from({ length: 50 }, (_, i) => deep(i)));
    const { result } = renderHook(() => useAccountAddFlow(options({ seedVault })));

    await act(() => result.current.selectSeedVault());

    expect(result.current.seedVaultAccounts.map((a) => a.address)).toEqual([
      'Deep40',
      'Deep0',
      'Deep1',
      'Deep2',
      'Deep3',
      'Deep4',
    ]);
  });

  it('stays on the step with the reason when Seed Vault did not answer', async () => {
    withWallets([]);
    const seedVault = access();
    seedVault.listAccounts.mockRejectedValue(
      Object.assign(new Error('x'), { reason: 'cancelled' })
    );
    const { result } = renderHook(() => useAccountAddFlow(options({ seedVault })));

    await act(() => result.current.selectSeedVault());

    expect(result.current.step).toBe('import-seed-vault');
    expect(result.current.seedVaultError).toBe('wallet.seedVault.errors.cancelled');
    expect(result.current.seedVaultAccounts).toEqual([]);
  });
});
