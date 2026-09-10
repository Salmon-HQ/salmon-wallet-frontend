/**
 * The lock overlay used to mount inside `(tabs)/_layout.tsx`, which sits
 * BEHIND every screen pushed on the `(app)` stack — a lock landing while
 * Wallets or Activity was open left balances sitting on top of the lock.
 * It now mounts in `(app)/_layout.tsx`, a sibling of the `<Stack>` itself,
 * so it covers every screen the stack can push. A Powerup has no screen at
 * all now — an installed one is a sub-tab of Home and the catalogue is a
 * sheet over Home — so the overlay covers it with Home.
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';

const screensByName: Record<string, Record<string, unknown> | undefined> = {};

jest.mock('expo-router', () => {
  const ReactActual = require('react');
  const Screen = ({ name, options }: { name: string; options?: Record<string, unknown> }) => {
    screensByName[name] = options;
    return null;
  };
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Screen = Screen;
  return {
    Stack,
    useRouter: () => ({ replace: jest.fn() }),
    usePathname: () => '/',
  };
});

const accountState = { locked: false };
/** One entry per commit of the tree, holding the surface count that commit saw. */
const surfaceTrace: number[] = [];
/** The callbacks the layout hands the lock, captured by the mock below. */
let lockContentProps: {
  onUnlock: (password: string) => Promise<boolean>;
  onUnlockExited?: () => void;
} | null = null;

// The derived-account scan is the shared hook's job and has its own suite; the
// shell only has to mount its provider.
jest.mock('../../src/contexts/DerivedAccountsContext', () => ({
  DerivedAccountsProvider: ({ children }: { children?: React.ReactNode }) => children,
  useDerivedAccounts: () => ({ status: { scanningAccountId: null }, rescan: jest.fn() }),
}));

jest.mock('@salmon/shared', () => ({
  // The confirmation provider and host are core's own (their own suites);
  // the layout only has to mount them.
  SignatureRequestProvider: ({ children }: { children: React.ReactNode }) => children,
  isSignableSolanaAccount: () => false,
  // The providers the layout mounts live in shared now; the task chrome is the
  // real one, developer mode is pass-through (its flags are mocked below).
  ...jest.requireActual('@salmon/shared/src/contexts/TaskChromeContext'),
  // Pass-through, plus a probe: it is mounted inside `TaskChromeProvider` and
  // outside the lock overlay, so it can report the surface count across the
  // release without unmounting with the gate.
  DeveloperModeProvider: ({ children }: { children: React.ReactNode }) => {
    const ReactActual = require('react');
    const { Text } = require('react-native');
    const { useTaskChrome } = jest.requireActual('@salmon/shared/src/contexts/TaskChromeContext');
    const Probe = () => {
      const { surfaceKey } = useTaskChrome();
      // Every commit is recorded, not just the last: the defect this guards
      // is an intermediate commit, and `act()` flushes effects before any
      // assertion can see one.
      surfaceTrace.push(surfaceKey);
      return ReactActual.createElement(Text, { testID: 'surface-key' }, String(surfaceKey));
    };
    return ReactActual.createElement(
      ReactActual.Fragment,
      null,
      ReactActual.createElement(Probe),
      children
    );
  },
  useUserConfig: () => ({
    developerNetworks: false,
    toggleDeveloperNetworks: jest.fn(),
    showUnverifiedTokens: false,
    setShowUnverifiedTokens: jest.fn(),
  }),
  MIRROR_NETWORK_IDS: { 'solana-mainnet': 'solana-devnet' },
  ensureMirrorNetworks: jest.fn(async () => []),
  useAccountsContext: () => [
    accountState,
    {
      unlockAccounts: jest.fn(async () => true),
      unlockWithCachedKey: jest.fn(),
      removeAllAccounts: jest.fn(),
    },
  ],
  getStashItem: jest.fn(),
}));

jest.mock('../../src/contexts/BiometricContext', () => ({
  BiometricProvider: ({ children }: { children: React.ReactNode }) => children,
  useBiometric: () => ({
    ready: true,
    available: false,
    armed: false,
    kind: null,
    arm: jest.fn(),
    unlock: jest.fn(),
    disarm: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('../../src/utils/sinkAndFloat', () => ({ FLOAT_DELAY_MS: 0 }));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  useReducedMotion: () => false,
}));

jest.mock('../../src/components', () => {
  const { View } = require('react-native');
  const ReactActual = require('react');
  return {
    ConfirmationHost: () => null,
    LockOverlay: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(
        View,
        { testID: 'lock-overlay', style: { position: 'absolute', zIndex: 1000 } },
        children
      ),
    LockContent: (props: {
      onUnlock: (password: string) => Promise<boolean>;
      onUnlockExited?: () => void;
    }) => {
      lockContentProps = props;
      return ReactActual.createElement(View, { testID: 'lock-content' });
    },
  };
});

import AppLayout from '../../app/(app)/_layout';

describe('the (app) shell', () => {
  beforeEach(() => {
    for (const key of Object.keys(screensByName)) delete screensByName[key];
    accountState.locked = false;
    lockContentProps = null;
    surfaceTrace.length = 0;
  });

  it('registers Wallets, Activity and Settings as pushed screens of this same layout', () => {
    render(<AppLayout />);

    expect('wallets' in screensByName).toBe(true);
    expect('activity' in screensByName).toBe(true);
    // Settings used to be a hidden tab inside `(tabs)`, which sits BELOW this
    // layout's overlay — a lock landing on a settings sub-screen left secrets
    // sitting on top of it. On this stack it is covered like anything else.
    expect('settings' in screensByName).toBe(true);
  });

  it('does not render the lock overlay while unlocked', () => {
    const { queryByTestId } = render(<AppLayout />);

    expect(queryByTestId('lock-overlay')).toBeNull();
  });

  it('renders the lock overlay as a sibling above the stack when locked, covering every pushed screen', () => {
    accountState.locked = true;
    const { getByTestId } = render(<AppLayout />);

    // Wallets, Activity and Settings are all registered on the same Stack
    // this layout owns — the overlay is a sibling of that Stack, not a child
    // of any one screen, so it sits above whichever of them is on top.
    expect('wallets' in screensByName).toBe(true);
    expect('activity' in screensByName).toBe(true);
    expect('settings' in screensByName).toBe(true);

    const overlay = getByTestId('lock-overlay');
    const style = Object.assign({}, ...[overlay.props.style].flat(Infinity).filter(Boolean));
    expect(style.position).toBe('absolute');
    expect(style.zIndex).toBeGreaterThanOrEqual(1000);
  });

  /**
   * The frame that removes the gate is the frame that mounts what floats up
   * through it (spec 031 §D2).
   *
   * Published from an effect on `isLocked`, the surfacing landed one painted
   * frame late: that frame showed Home fully assembled and at rest, and the
   * float then played on content the user had already watched arrive. The two
   * sets have to be batched into one commit, so a single flush must produce
   * both the overlay's removal and the incremented count.
   */
  it('surfaces the screen in the same commit that releases the gate', async () => {
    accountState.locked = true;
    const { getByTestId, queryByTestId } = render(<AppLayout />);

    expect(getByTestId('lock-overlay')).toBeTruthy();
    const before = Number(getByTestId('surface-key').props.children);

    // The unlock resolves: shared state flips, but the gate is held until the
    // wait reports its wave has left.
    await act(async () => {
      await lockContentProps?.onUnlock('password');
    });
    accountState.locked = false;
    expect(getByTestId('lock-overlay')).toBeTruthy();
    expect(Number(getByTestId('surface-key').props.children)).toBe(before);

    // The wave has left. `FLOAT_DELAY_MS` is mocked to 0, so the release lands
    // on the next tick — and it must land whole.
    surfaceTrace.length = 0;
    jest.useFakeTimers();
    act(() => {
      lockContentProps?.onUnlockExited?.();
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();

    expect(queryByTestId('lock-overlay')).toBeNull();
    expect(Number(getByTestId('surface-key').props.children)).toBe(before + 1);
    // The point of the test: ONE commit carried the release, and it already
    // had the new count. Bumped from an effect the trace reads
    // `[before, before + 1]` — that first entry is the frame that painted Home
    // at rest, and it is exactly what the owner saw as a float running twice.
    expect(surfaceTrace).toEqual([before + 1]);
  });
});
