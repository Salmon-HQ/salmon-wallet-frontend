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
import { SeedVaultError } from '../blockchain/solana/seed-vault-signer';
import { isVaultKeyCached, EncryptionMaterialMissingError } from '../crypto/encrypt-mnemonics';
import { validateMnemonic } from '../crypto/mnemonic';
import {
  createAccount,
  importAccountFromPrivateKey,
  importSeedVaultAccount,
  importWatchOnlyAccount,
} from '../factories/account-factory';
import { getScanNetworks, scanDerivedAccounts } from '../utils/derived-accounts';
import { useDeveloperModeSettings } from '../contexts/DeveloperModeContext';
import { trackEvent } from '../analytics/client';
import { DuplicateAccountError } from './useAccountsMutationHelpers';

vi.mock('../contexts/AccountsContext', () => ({ useAccountsContext: vi.fn() }));
vi.mock('../contexts/DeveloperModeContext', () => ({ useDeveloperModeSettings: vi.fn() }));
vi.mock('../crypto/encrypt-mnemonics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../crypto/encrypt-mnemonics')>()),
  isVaultKeyCached: vi.fn(),
}));
vi.mock('../crypto/mnemonic', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../crypto/mnemonic')>()),
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

/** What the two import steps hold; each render returns a fresh object, as the real hooks do. */
const imports = vi.hoisted(() => ({
  privateKey: null as string | null,
  watched: null as string | null,
  reset: vi.fn(),
}));
vi.mock('./useImportPrivateKey', () => ({
  useImportPrivateKey: () => ({
    value: '',
    setValue: vi.fn(),
    error: null,
    address: null,
    privateKey: imports.privateKey,
    validating: false,
    hasInput: false,
    validate: vi.fn(),
    reset: imports.reset,
    networkId: 'solana-mainnet',
  }),
}));
vi.mock('./useImportWatchOnly', () => ({
  useImportWatchOnly: () => ({
    value: '',
    setValue: vi.fn(),
    error: null,
    address: imports.watched,
    hasInput: false,
    validate: vi.fn(),
    reset: imports.reset,
    networkId: 'solana-mainnet',
  }),
}));

const accountsMock = vi.mocked(useAccountsContext);
const vaultCachedMock = vi.mocked(isVaultKeyCached);
const validateMnemonicMock = vi.mocked(validateMnemonic);
const createMock = vi.mocked(createAccount);
const networksMock = vi.mocked(getScanNetworks);
const scanMock = vi.mocked(scanDerivedAccounts);
const developerModeMock = vi.mocked(useDeveloperModeSettings);

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
  imports.privateKey = null;
  imports.watched = null;
  imports.reset.mockReset();
  accountsMock.mockReturnValue([
    {
      accounts: [
        { id: 'a1', secret: { kind: 'mnemonic', mnemonic: 'a' } },
        { id: 'a2', secret: { kind: 'mnemonic', mnemonic: 'b' } },
      ],
      activeAccount,
    },
    { addAccount, removeAccount, checkPassword, getNetworkId: () => 'solana-devnet' },
  ] as unknown as ReturnType<typeof useAccountsContext>);
  vaultCachedMock.mockResolvedValue(true);
  addAccount.mockResolvedValue(undefined);
  checkPassword.mockResolvedValue(true);
  createMock.mockResolvedValue({ account: { id: 'new' } } as never);
  networksMock.mockResolvedValue(['solana-mainnet']);
  developerModeMock.mockReturnValue({ bitcoinEnabled: true } as ReturnType<
    typeof useDeveloperModeSettings
  >);
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
      id: expect.any(String),
      avatar: expect.any(String),
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

    // The save replaces the stale wallet, decided against storage (spec US3 scenario 4).
    expect(addAccount).toHaveBeenCalledWith({ id: 'sv' }, undefined);
    expect(removeAccount).not.toHaveBeenCalled();
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
    seedVault.listAccounts.mockRejectedValue(new SeedVaultError('cancelled'));
    const { result } = renderHook(() => useAccountAddFlow(options({ seedVault })));

    await act(() => result.current.selectSeedVault());

    expect(result.current.step).toBe('import-seed-vault');
    expect(result.current.seedVaultError).toBe('wallet.seedVault.errors.cancelled');
    expect(result.current.seedVaultAccounts).toEqual([]);
  });
});

describe('useAccountAddFlow — derive with the Bitcoin choice', () => {
  beforeEach(() => {
    networksMock.mockResolvedValue(['solana-mainnet', 'bitcoin-mainnet']);
    scanMock.mockResolvedValue({ accounts: [], failedNetworks: [] });
  });

  it.each([
    [false, ['solana-mainnet']],
    [true, ['solana-mainnet', 'bitcoin-mainnet']],
  ])('with Bitcoin %s scans %j', async (bitcoinEnabled, expected) => {
    developerModeMock.mockReturnValue({ bitcoinEnabled } as ReturnType<
      typeof useDeveloperModeSettings
    >);
    const { result } = renderHook(() => useAccountAddFlow(options()));

    await act(() => result.current.selectDerive());

    expect(scanMock).toHaveBeenCalledWith('owner mnemonic', expected);
  });
});

describe('useAccountAddFlow — one wallet id per input', () => {
  const privateKeyMock = vi.mocked(importAccountFromPrivateKey);
  const watchOnlyMock = vi.mocked(importWatchOnlyAccount);
  const trackMock = vi.mocked(trackEvent);

  /** The id and avatar each attempt handed the factory, in order. */
  const identities = (factory: { mock: { calls: [{ id?: string; avatar?: string }][] } }) =>
    factory.mock.calls.map(([{ id, avatar }]) => ({ id, avatar }));

  const withActive = (active: { id: string; secret: unknown }) =>
    accountsMock.mockReturnValue([
      { accounts: [active], activeAccount: active },
      { addAccount, removeAccount, checkPassword, getNetworkId: () => 'solana-devnet' },
    ] as unknown as ReturnType<typeof useAccountsContext>);

  /** Fails the first save, then runs `between`, then a second attempt. */
  async function twoAttempts(
    result: { current: ReturnType<typeof useAccountAddFlow> },
    between: () => void = () => {}
  ) {
    addAccount.mockRejectedValueOnce(new Error('disk full'));
    await act(() => result.current.confirm());
    act(between);
    await act(() => result.current.confirm());
  }

  beforeEach(() => {
    privateKeyMock.mockResolvedValue({ account: { id: 'pk' } } as never);
    watchOnlyMock.mockResolvedValue({ account: { id: 'wo' } } as never);
    importSeedVaultMock.mockResolvedValue({ account: { id: 'sv' } } as never);
  });

  it('keeps the id and avatar across confirm attempts and rebuilds the account each time', async () => {
    const { result } = renderHook(() => useAccountAddFlow(options()));
    await reachSetName(result);

    await twoAttempts(result);

    expect(createMock).toHaveBeenCalledTimes(2);
    const [first, second] = identities(createMock);
    expect(first).toEqual({ id: expect.any(String), avatar: expect.any(String) });
    expect(second).toEqual(first);
  });

  it('keeps the id and avatar through re-auth', async () => {
    addAccount.mockRejectedValueOnce(new EncryptionMaterialMissingError());
    const { result } = renderHook(() => useAccountAddFlow(options()));
    await reachSetName(result);
    await act(() => result.current.confirm());
    expect(result.current.step).toBe('reauth');
    act(() => result.current.setReauthPassword('correct-horse'));

    await act(() => result.current.confirmReauth());

    const [first, second] = identities(createMock);
    expect(first).toEqual({ id: expect.any(String), avatar: expect.any(String) });
    expect(second).toEqual(first);
  });

  it('keeps them across renders that return fresh import objects with the same key', async () => {
    imports.privateKey = 'key-one';
    const { result, rerender } = renderHook(() => useAccountAddFlow(options()));

    await twoAttempts(result, () => rerender());

    const [first, second] = identities(privateKeyMock);
    expect(first).toEqual({ id: expect.any(String), avatar: expect.any(String) });
    expect(second).toEqual(first);
  });

  it('keeps them on a rename, and on the same phrase typed with other spacing', async () => {
    const { result } = renderHook(() => useAccountAddFlow(options()));
    await reachSetName(result);

    await twoAttempts(result, () => {
      result.current.setAccountName('Savings');
      result.current.setSeedWords(['valid', ' seed', 'phrase ']);
    });

    const [first, second] = identities(createMock);
    expect(first).toEqual({ id: expect.any(String), avatar: expect.any(String) });
    expect(second).toEqual(first);
    expect(createMock.mock.calls[1]![0].name).toBe('Savings');
  });

  it('keeps them for an imported phrase when the active wallet changes', async () => {
    const { result, rerender } = renderHook(() => useAccountAddFlow(options()));
    await reachSetName(result);

    await twoAttempts(result, () => {
      withActive({ id: 'wallet-2', secret: activeAccount.secret });
      rerender();
    });

    const [first, second] = identities(createMock);
    expect(first).toEqual({ id: expect.any(String), avatar: expect.any(String) });
    expect(second).toEqual(first);
  });

  /** Both attempts got an id and avatar, and the second got new ones. */
  const expectRenewed = (factory: Parameters<typeof identities>[0]) => {
    const [first, second] = identities(factory);
    expect(first).toEqual({ id: expect.any(String), avatar: expect.any(String) });
    expect(second).toEqual({ id: expect.any(String), avatar: expect.any(String) });
    expect(second!.id).not.toBe(first!.id);
  };

  // With a new id the same phrase meets the stored wallet and gets the duplicate message.
  it('renews them after a save that resolved, for the same input in a panel left open', async () => {
    const { result } = renderHook(() => useAccountAddFlow(options()));
    await reachSetName(result);

    await act(() => result.current.confirm());
    await act(() => result.current.confirm());

    expectRenewed(createMock);
  });

  it('renews them when the phrase changes', async () => {
    const { result } = renderHook(() => useAccountAddFlow(options()));
    await reachSetName(result);

    await twoAttempts(result, () => result.current.setSeedWords(['other', 'seed', 'phrase']));

    expectRenewed(createMock);
  });

  it('renews them when the private key changes', async () => {
    imports.privateKey = 'key-one';
    const { result, rerender } = renderHook(() => useAccountAddFlow(options()));

    await twoAttempts(result, () => {
      imports.privateKey = 'key-two';
      rerender();
    });

    expectRenewed(privateKeyMock);
  });

  it('renews them when the watched address changes', async () => {
    imports.watched = 'AddrWatchedOne';
    const { result, rerender } = renderHook(() => useAccountAddFlow(options()));

    await twoAttempts(result, () => {
      imports.watched = 'AddrWatchedTwo';
      rerender();
    });

    expectRenewed(watchOnlyMock);
  });

  it('renews them when the Seed Vault access changes, even by its token alone', async () => {
    const row = {
      derivationPath: "bip32:/m/44'/501'/0'/0'",
      address: 'AddrA',
      name: 'AddrA',
      isUserWallet: false,
    };
    const seedVault = {
      listAccounts: vi.fn().mockResolvedValue([
        { ...row, authToken: '7' },
        { ...row, authToken: '8' },
      ]),
      authorizeAnother: vi.fn(),
      createSeed: vi.fn(),
      importSeed: vi.fn(),
    };
    withActive({ id: 'wallet-1', secret: activeAccount.secret });
    const { result } = renderHook(() => useAccountAddFlow(options({ seedVault })));
    await act(() => result.current.selectSeedVault());
    act(() => result.current.toggleSeedVault(result.current.seedVaultAccounts[0]!));

    await twoAttempts(result, () =>
      result.current.toggleSeedVault(result.current.seedVaultAccounts[1]!)
    );

    expectRenewed(importSeedVaultMock);
  });

  describe('a derived account', () => {
    const derived = (index: number) => ({
      address: `derived-${index}`,
      index,
      networkId: 'solana-mainnet',
    });

    async function pick(result: { current: ReturnType<typeof useAccountAddFlow> }, index: number) {
      scanMock.mockResolvedValue({
        accounts: [derived(1), derived(2)],
        failedNetworks: [],
      } as never);
      await act(() => result.current.selectDerive());
      act(() => result.current.toggleDerived(derived(index) as never));
    }

    it('renews them when the derived position changes', async () => {
      const { result } = renderHook(() => useAccountAddFlow(options()));
      await pick(result, 1);

      await twoAttempts(result, () => result.current.toggleDerived(derived(2) as never));

      expectRenewed(createMock);
    });

    it('renews them when the active wallet it derives from changes', async () => {
      const { result, rerender } = renderHook(() => useAccountAddFlow(options()));
      await pick(result, 1);

      await twoAttempts(result, () => {
        withActive({ id: 'wallet-2', secret: activeAccount.secret });
        rerender();
      });

      expectRenewed(createMock);
    });
  });

  it('reports a duplicate with the import copy', async () => {
    addAccount.mockRejectedValueOnce(new DuplicateAccountError());
    const opts = options();
    const { result } = renderHook(() => useAccountAddFlow(opts));
    await reachSetName(result);

    await act(() => result.current.confirm());

    expect(opts.onFailure).toHaveBeenCalledWith(
      expect.any(DuplicateAccountError),
      'wallet.import.errors.duplicate'
    );
  });

  it('reports a duplicate watched address with the watch-only copy', async () => {
    imports.watched = 'AddrWatchedOne';
    addAccount.mockRejectedValueOnce(new DuplicateAccountError());
    const opts = options();
    const { result } = renderHook(() => useAccountAddFlow(opts));

    await act(() => result.current.confirm());

    expect(opts.onFailure).toHaveBeenCalledWith(
      expect.any(DuplicateAccountError),
      'wallet.watchOnly.errors.duplicate'
    );
  });

  it.each([
    [
      'analytics',
      () =>
        trackMock.mockImplementationOnce(() => {
          throw new Error('analytics down');
        }),
    ],
    [
      'the import reset',
      () =>
        imports.reset.mockImplementationOnce(() => {
          throw new Error('reset failed');
        }),
    ],
  ])('never reports a stored wallet as failed when %s throws', async (_, breakIt) => {
    breakIt();
    const opts = options();
    const { result } = renderHook(() => useAccountAddFlow(opts));
    await reachSetName(result);

    await act(() => result.current.confirm());

    expect(addAccount).toHaveBeenCalledTimes(1);
    expect(opts.onFailure).not.toHaveBeenCalled();
    expect(opts.onWaitEnd).not.toHaveBeenCalled();
  });

  it('never reports a stored wallet as failed when onPersisted throws', async () => {
    const opts = options({
      onPersisted: vi.fn(() => {
        throw new Error('hand-off failed');
      }),
    });
    const { result } = renderHook(() => useAccountAddFlow(opts));
    await reachSetName(result);

    await act(() => result.current.confirm());

    expect(opts.onPersisted).toHaveBeenCalledTimes(1);
    expect(opts.onFailure).not.toHaveBeenCalled();
    expect(opts.onWaitEnd).not.toHaveBeenCalled();
  });
});
