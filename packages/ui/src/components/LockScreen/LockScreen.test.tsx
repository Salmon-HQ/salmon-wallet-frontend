/**
 * @vitest-environment jsdom
 *
 * The lock screen's slot contract, asserted where both apps inherit it.
 *
 * Unlock is the most-seen screen in the product, and its layout is a spec
 * commitment (013 FR-005): the water column behind the stack, the forgot
 * affordance in `body` against the field it escapes from, and every piece of
 * feedback — wrong password, throttle — in the `assist` band, so nothing ever
 * displaces the field or the action. The mobile twin asserts the same shape
 * in `apps/mobile/src/components/GateContainer/LockContent.test.tsx`.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mutable so a test can put the screen into its throttled state.
const mockThrottle = { failedAttempts: 0, remainingMs: 0, remainingSeconds: 0, refresh: vi.fn() };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// The real theme tables plus the one hook this screen reads. The root
// `@salmon/shared` barrel cannot be imported here — it reaches React Native,
// which Vite cannot parse.
vi.mock('@salmon/shared', async () => {
  const theme = await import('../../../../shared/src/theme');
  // The passage's own numbers and the hook that holds the wait mounted: both
  // are runtime-agnostic, and faking them would let this screen's sink drift
  // from the verb every other surface speaks.
  const sinkFloat = await import('../../../../shared/src/motion/sinkFloat');
  const waitExit = await import('../../../../shared/src/hooks/useWaitExit');
  return {
    ...theme,
    ...sinkFloat,
    ...waitExit,
    useUnlockThrottle: () => mockThrottle,
  };
});

// The loading overlay reads wavefront constants that live outside the theme
// subtree, and it draws nothing this file asserts. What it does carry is the
// report the unlock passage waits on, so the stand-in hands `onExited` back.
const { wait } = vi.hoisted(() => ({ wait: {} as { onExited?: () => void } }));
vi.mock('../LoadingScreen', () => ({
  LoadingScreen: ({ onExited }: { onExited?: () => void }) => {
    wait.onExited = onExited;
    return null;
  },
}));

// The water column's drawing has its own tests; what this file must prove is
// that the lock mounts it.
vi.mock('../WaterColumn', () => ({
  WaterColumn: () => <div data-testid="water-column" />,
  waterColumnHost: { position: 'relative', isolation: 'isolate' },
}));

import { LockScreen } from './LockScreen';

const renderLock = (onUnlock = vi.fn().mockResolvedValue(true), onUnlocked?: () => void) => {
  render(
    <LockScreen
      onUnlock={onUnlock}
      onUnlocked={onUnlocked}
      onRemoveAllAccounts={vi.fn().mockResolvedValue(undefined)}
    />
  );
  return onUnlock;
};

describe('LockScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThrottle.failedAttempts = 0;
    mockThrottle.remainingMs = 0;
    mockThrottle.remainingSeconds = 0;
  });

  afterEach(cleanup);

  it('mounts the water column behind the stack', () => {
    renderLock();
    expect(within(screen.getByTestId('lock-screen')).getByTestId('water-column')).toBeTruthy();
  });

  it('keeps the forgot affordance in `body`, against the field it escapes from', () => {
    renderLock();
    const body = within(screen.getByTestId('onboarding-slot-body'));
    expect(body.getByTestId('lock-password-input')).toBeTruthy();
    expect(body.getByTestId('lock-forgot-password-button')).toBeTruthy();
  });

  it('puts the wrong-password error in `assist`, moving nothing', async () => {
    const onUnlock = renderLock(vi.fn().mockResolvedValue(false));

    fireEvent.change(screen.getByTestId('lock-password-input'), {
      target: { value: 'not-the-password' },
    });
    fireEvent.click(screen.getByTestId('lock-unlock-button'));

    const assist = within(screen.getByTestId('onboarding-slot-assist'));
    await waitFor(() => {
      expect(assist.getByTestId('lock-error')).toBeTruthy();
    });
    expect(onUnlock).toHaveBeenCalledWith('not-the-password');
    // Feedback is a band occupant, not a displacement: the button holds.
    expect(screen.getByTestId('lock-unlock-button')).toBeTruthy();
  });

  it('parks the release until the wait reports its last wave has left', async () => {
    // The release unmounts this screen, so firing it on a successful unlock
    // cuts the closing wave — the cut the whole passage exists to prevent
    // (DESIGN.md §The wait, "The unlock passage is sequential and counted").
    const onUnlocked = vi.fn();
    const onUnlock = renderLock(vi.fn().mockResolvedValue(true), onUnlocked);

    fireEvent.change(screen.getByTestId('lock-password-input'), {
      target: { value: 'the-password' },
    });
    fireEvent.click(screen.getByTestId('lock-unlock-button'));

    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalledWith('the-password');
    });
    expect(onUnlocked).not.toHaveBeenCalled();

    act(() => wait.onExited?.());
    expect(onUnlocked).toHaveBeenCalledTimes(1);
  });

  it('puts the throttle notice in `assist` and disables the button in place', () => {
    mockThrottle.remainingMs = 5000;
    mockThrottle.remainingSeconds = 5;
    renderLock();

    const assist = within(screen.getByTestId('onboarding-slot-assist'));
    const notice = assist.getByTestId('lock-throttle-notice');
    expect(notice.getAttribute('aria-live')).toBe('polite');
    expect(within(notice).getByText('lock.throttled_body')).toBeTruthy();

    // The button never leaves its spot; it goes dead while the band explains.
    const button = screen.getByTestId('lock-unlock-button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
