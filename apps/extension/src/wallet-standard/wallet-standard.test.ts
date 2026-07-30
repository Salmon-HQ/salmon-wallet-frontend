/**
 * @vitest-environment jsdom
 *
 * Functional tests for the vendored wallet-standard adapter. The wallet side of
 * the Wallet Standard is plain DOM events + synchronous callbacks (see
 * https://github.com/wallet-standard/wallet-standard/blob/master/packages/core/wallet/src/register.ts),
 * so registration and feature exposure are fully testable in jsdom — no browser
 * runtime needed.
 */
import { describe, expect, it, vi } from 'vitest';
import bs58 from 'bs58';
import type { Wallet } from '@wallet-standard/base';
import { initialize } from './index';
import { registerWallet } from './register';
import { SalmonWallet } from './wallet';
import { SOLANA_CHAINS } from './solana';
import type { Salmon, SalmonEvent, SalmonPublicKey } from './window';

/**
 * Deterministic `{ toBase58, toBytes }` fixture — the only two members
 * wallet-standard reads off a public key. A fixed vector keeps failures
 * readable and needs no @solana/web3.js Keypair.
 */
function fixedPublicKey(seed: number): SalmonPublicKey {
  const bytes = new Uint8Array(32).fill(seed);
  const base58 = bs58.encode(bytes);
  return { toBase58: () => base58, toBytes: () => bytes };
}

/** Minimal in-memory Salmon provider double implementing the injected-provider surface. */
function createMockSalmon(publicKey: SalmonPublicKey | null = null): Salmon {
  const listeners: Record<string, ((...args: unknown[]) => unknown)[]> = {};
  const salmon = {
    publicKey,
    connect: vi.fn(async () => {
      salmon.publicKey = publicKey ?? fixedPublicKey(0);
      return { publicKey: salmon.publicKey };
    }),
    disconnect: vi.fn(async () => {
      salmon.publicKey = null;
      (listeners.disconnect ?? []).forEach((listener) => listener());
    }),
    signAndSendTransactionBytes: vi.fn(),
    signTransactionBytes: vi.fn(),
    signAllTransactionsBytes: vi.fn(),
    signMessage: vi.fn(async () => ({ signature: new Uint8Array(64).fill(7) })),
    signOffchainMessage: vi.fn(async () => ({
      signedOffchainMessage: new Uint8Array(10).fill(1),
      signature: new Uint8Array(64).fill(9),
      signatureType: 'ed25519' as const,
    })),
    signIn: vi.fn(async (input: { useOffchainMessage?: { messageVersion: 1 } }) => {
      // Sign-in proves ownership, so it connects if not already connected.
      salmon.publicKey = salmon.publicKey ?? publicKey ?? fixedPublicKey(0);
      return {
        address: salmon.publicKey.toBase58(),
        publicKey: salmon.publicKey.toBytes(),
        signedMessage: new Uint8Array(12).fill(3),
        signature: new Uint8Array(64).fill(5),
        signatureType: 'ed25519' as const,
        ...(input?.useOffchainMessage
          ? { signedMessageFormat: { kind: 'offchainMessage' as const, messageVersion: 1 as const } }
          : {}),
      };
    }),
    on<E extends keyof SalmonEvent>(event: E, listener: SalmonEvent[E]) {
      (listeners[event] ??= []).push(listener as (...args: unknown[]) => unknown);
    },
    off<E extends keyof SalmonEvent>(event: E, listener: SalmonEvent[E]) {
      listeners[event] = (listeners[event] ?? []).filter((existing) => existing !== listener);
    },
    emit(event: keyof SalmonEvent) {
      (listeners[event] ?? []).forEach((listener) => listener());
    },
  };
  return salmon as unknown as Salmon;
}

describe('registerWallet', () => {
  it('dispatches wallet-standard:register-wallet so an already-listening app receives the wallet', () => {
    // Arrange
    const registered: Wallet[] = [];
    const onRegister = (event: Event) => {
      (event as unknown as { detail: (api: { register(w: Wallet): void }) => void }).detail({
        register: (wallet) => registered.push(wallet),
      });
    };
    window.addEventListener('wallet-standard:register-wallet', onRegister);
    const wallet = new SalmonWallet(createMockSalmon());

    // Act
    registerWallet(wallet);

    // Assert
    expect(registered).toEqual([wallet]);
    window.removeEventListener('wallet-standard:register-wallet', onRegister);
  });

  it('registers with an app that announces readiness later via wallet-standard:app-ready', () => {
    // Arrange
    const registered: Wallet[] = [];
    const wallet = new SalmonWallet(createMockSalmon());
    registerWallet(wallet);

    // Act — app loads after the wallet and dispatches app-ready
    window.dispatchEvent(
      new CustomEvent('wallet-standard:app-ready', {
        detail: { register: (incoming: Wallet) => registered.push(incoming) },
      }),
    );

    // Assert — registerWallet keeps its app-ready listener forever (by design),
    // so wallets registered in earlier tests may respond too; only membership matters.
    expect(registered).toContain(wallet);
  });
});

describe('initialize', () => {
  it('registers a SalmonWallet wrapping the injected provider', () => {
    // Arrange
    const registered: Wallet[] = [];
    const onRegister = (event: Event) => {
      (event as unknown as { detail: (api: { register(w: Wallet): void }) => void }).detail({
        register: (wallet) => registered.push(wallet),
      });
    };
    window.addEventListener('wallet-standard:register-wallet', onRegister);
    const salmon = createMockSalmon();

    // Act
    initialize(salmon);

    // Assert
    expect(registered).toHaveLength(1);
    expect(registered[0].name).toBe('Salmon');
    expect(
      (registered[0].features as { 'salmon:': { salmon: Salmon } })['salmon:'].salmon,
    ).toBe(salmon);
    window.removeEventListener('wallet-standard:register-wallet', onRegister);
  });
});

describe('SalmonWallet', () => {
  it('exposes the expected wallet-standard identity, chains, and features', () => {
    // Arrange & Act
    const wallet = new SalmonWallet(createMockSalmon());

    // Assert
    expect(wallet.version).toBe('1.0.0');
    expect(wallet.name).toBe('Salmon');
    expect(wallet.icon.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(wallet.chains).toEqual([...SOLANA_CHAINS]);
    expect(Object.keys(wallet.features).sort()).toEqual([
      'salmon:',
      'solana:signAndSendTransaction',
      'solana:signIn',
      'solana:signMessage',
      'solana:signOffchainMessage',
      'solana:signTransaction',
      'standard:connect',
      'standard:disconnect',
      'standard:events',
    ]);
    expect(
      wallet.features['solana:signTransaction'].supportedTransactionVersions,
    ).toEqual(['legacy', 0]);
    expect(
      wallet.features['solana:signAndSendTransaction'].supportedTransactionVersions,
    ).toEqual(['legacy', 0]);
    expect(
      wallet.features['solana:signOffchainMessage'].supportedMessageVersions,
    ).toEqual([1]);
    expect(wallet.features['solana:signOffchainMessage'].version).toBe('1.0.0');
    // 1.1.0 advertises PR#93 `useOffchainMessage` support.
    expect(wallet.features['solana:signIn'].version).toBe('1.1.0');
  });

  it('connects through the provider, exposes the account, and emits a change event', async () => {
    // Arrange
    const publicKey = fixedPublicKey(1);
    const salmon = createMockSalmon(publicKey);
    (salmon as unknown as { publicKey: null }).publicKey = null;
    const wallet = new SalmonWallet(salmon);
    expect(wallet.accounts).toEqual([]);
    const onChange = vi.fn();
    wallet.features['standard:events'].on('change', onChange);

    // Act
    const { accounts } = await wallet.features['standard:connect'].connect();

    // Assert
    expect(salmon.connect).toHaveBeenCalledOnce();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].address).toBe(publicKey.toBase58());
    expect(accounts[0].publicKey).toEqual(publicKey.toBytes());
    expect(accounts[0].chains).toEqual([...SOLANA_CHAINS]);
    expect(accounts[0].features).toContain('solana:signMessage');
    expect(onChange).toHaveBeenCalledWith({ accounts: wallet.accounts });
  });

  it('clears accounts and emits change when the provider disconnects', async () => {
    // Arrange
    const salmon = createMockSalmon(fixedPublicKey(2));
    const wallet = new SalmonWallet(salmon);
    expect(wallet.accounts).toHaveLength(1);
    const onChange = vi.fn();
    wallet.features['standard:events'].on('change', onChange);

    // Act
    await wallet.features['standard:disconnect'].disconnect();

    // Assert
    expect(salmon.disconnect).toHaveBeenCalledOnce();
    expect(wallet.accounts).toEqual([]);
    expect(onChange).toHaveBeenCalledWith({ accounts: [] });
  });

  it('delegates signMessage to the provider for the connected account', async () => {
    // Arrange
    const salmon = createMockSalmon(fixedPublicKey(3));
    const wallet = new SalmonWallet(salmon);
    const account = wallet.accounts[0];
    const message = new TextEncoder().encode('hello salmon');

    // Act
    const outputs = await wallet.features['solana:signMessage'].signMessage({
      account,
      message,
    });

    // Assert
    expect(salmon.signMessage).toHaveBeenCalledWith(message);
    expect(outputs).toHaveLength(1);
    expect(outputs[0].signedMessage).toBe(message);
    expect(outputs[0].signature).toEqual(new Uint8Array(64).fill(7));
  });

  it('delegates signOffchainMessage to the provider and returns the PR#92 output shape', async () => {
    // Arrange
    const publicKey = fixedPublicKey(4);
    const salmon = createMockSalmon(publicKey);
    const wallet = new SalmonWallet(salmon);
    const account = wallet.accounts[0];
    const requiredSigners = [publicKey.toBytes()];

    // Act
    const outputs = await wallet.features['solana:signOffchainMessage'].signOffchainMessage({
      account,
      message: 'hello ocms',
      messageVersion: 1,
      requiredSigners,
    });

    // Assert
    expect(salmon.signOffchainMessage).toHaveBeenCalledWith({
      messageVersion: 1,
      message: 'hello ocms',
      requiredSigners,
    });
    expect(outputs).toHaveLength(1);
    expect(outputs[0].signedOffchainMessage).toBeInstanceOf(Uint8Array);
    expect(outputs[0].signedOffchainMessage).toEqual(new Uint8Array(10).fill(1));
    expect(outputs[0].signature).toEqual(new Uint8Array(64).fill(9));
    expect(outputs[0].signatureType).toBe('ed25519');
  });

  it('signIn connects a not-yet-connected wallet and returns the SolanaSignInOutput shape', async () => {
    // Arrange — no prior connection
    const salmon = createMockSalmon(null);
    const wallet = new SalmonWallet(salmon);
    expect(wallet.accounts).toEqual([]);

    // Act — bare signIn() with no inputs is a valid request
    const outputs = await wallet.features['solana:signIn'].signIn();

    // Assert
    expect(salmon.signIn).toHaveBeenCalledTimes(1);
    expect(outputs).toHaveLength(1);
    expect(wallet.accounts).toHaveLength(1);
    expect(outputs[0].account).toBe(wallet.accounts[0]);
    expect(outputs[0].signedMessage).toEqual(new Uint8Array(12).fill(3));
    expect(outputs[0].signature).toEqual(new Uint8Array(64).fill(5));
    expect(outputs[0].signatureType).toBe('ed25519');
    expect(outputs[0].signedMessageFormat).toBeUndefined();
  });

  it('signIn forwards the input and surfaces signedMessageFormat on the OCMS path (PR#93)', async () => {
    // Arrange
    const salmon = createMockSalmon(fixedPublicKey(5));
    const wallet = new SalmonWallet(salmon);

    // Act
    const outputs = await wallet.features['solana:signIn'].signIn({
      statement: 'Sign in to Example.',
      nonce: 'abcd1234',
      useOffchainMessage: { messageVersion: 1 },
    });

    // Assert
    expect(salmon.signIn).toHaveBeenCalledWith(
      expect.objectContaining({
        statement: 'Sign in to Example.',
        nonce: 'abcd1234',
        useOffchainMessage: { messageVersion: 1 },
      }),
    );
    expect(outputs[0].signedMessageFormat).toEqual({
      kind: 'offchainMessage',
      messageVersion: 1,
    });
  });

  it('rejects signOffchainMessage for an unsupported message version', async () => {
    // Arrange
    const salmon = createMockSalmon(fixedPublicKey(6));
    const wallet = new SalmonWallet(salmon);

    // Act & Assert
    await expect(
      wallet.features['solana:signOffchainMessage'].signOffchainMessage({
        account: wallet.accounts[0],
        message: 'hello',
        messageVersion: 2 as unknown as 1,
        requiredSigners: [],
      }),
    ).rejects.toThrow('unsupported message version');
    expect(salmon.signOffchainMessage).not.toHaveBeenCalled();
  });

  it('rejects signOffchainMessage for an account it does not own', async () => {
    // Arrange
    const salmon = createMockSalmon(fixedPublicKey(7));
    const wallet = new SalmonWallet(salmon);
    const foreignWallet = new SalmonWallet(createMockSalmon(fixedPublicKey(8)));

    // Act & Assert
    await expect(
      wallet.features['solana:signOffchainMessage'].signOffchainMessage({
        account: foreignWallet.accounts[0],
        message: 'hello',
        messageVersion: 1,
        requiredSigners: [],
      }),
    ).rejects.toThrow('invalid account');
    expect(salmon.signOffchainMessage).not.toHaveBeenCalled();
  });

  it('rejects signMessage for an account it does not own', async () => {
    // Arrange
    const salmon = createMockSalmon(fixedPublicKey(9));
    const wallet = new SalmonWallet(salmon);
    const foreignWallet = new SalmonWallet(createMockSalmon(fixedPublicKey(10)));

    // Act & Assert
    await expect(
      wallet.features['solana:signMessage'].signMessage({
        account: foreignWallet.accounts[0],
        message: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toThrow('invalid account');
    expect(salmon.signMessage).not.toHaveBeenCalled();
  });
});
