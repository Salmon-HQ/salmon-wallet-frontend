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

// The real barrel, with only the throttle hook overridden so a test can put
// the screen into its throttled state.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useUnlockThrottle: () => mockThrottle,
}));

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

import { createSemantic, shadows, ThemeContext } from '@salmon/shared';
import type { ThemeContextValue } from '@salmon/shared';
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

  it("reads the live mode: in light the title and the field take light's inks", () => {
    // The screen used to read the static dark set, so a light side panel drew
    // a dark field under an unreadable title. Every ink comes off the theme
    // context now — the same contract mobile's `useSemantic()` has.
    const light = createSemantic('light');
    const value = {
      mode: 'light',
      preference: 'light',
      setPreference: async () => undefined,
      semantic: light,
      shadows,
      ready: true,
    } as unknown as ThemeContextValue;

    render(
      <ThemeContext.Provider value={value}>
        <LockScreen
          onUnlock={vi.fn().mockResolvedValue(true)}
          onRemoveAllAccounts={vi.fn().mockResolvedValue(undefined)}
        />
      </ThemeContext.Provider>
    );

    expect(screen.getByRole('heading', { level: 1 }).style.color).toBe(
      hexToRgb(light.text.primary)
    );
    const field = screen.getByTestId('lock-password-input');
    expect(getComputedStyle(field).backgroundColor).toBe(hexToRgb(light.input.ground));
    // The mark is the brand accent in both modes, never the text ink.
    expect(screen.getByTestId('brand-mark').getAttribute('fill')).toBe(light.accent.fill);
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

/** jsdom reports inline colours as `rgb(...)`, the tokens are hex. */
function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}
