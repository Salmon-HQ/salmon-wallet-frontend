/**
 * @vitest-environment jsdom
 *
 * "Choose your networks" on the DOM: the shared step drawn with the DOM kit,
 * in the flow's water. The step's own decisions are tested once, in
 * `packages/shared/src/kit/createNetworkChoiceScreen.test.tsx`.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSave = vi.fn(async (_enabled: boolean) => {});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../WaterColumn', () => ({
  WaterColumn: () => <div data-testid="water-column" />,
  waterColumnHost: {},
}));

vi.mock('../../../../shared/src/hooks/useUserConfig', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  saveBitcoinChoice: (enabled: boolean) => mockSave(enabled),
}));

import { NetworkChoicePage } from './NetworkChoicePage';

const onBack = vi.fn();
const onContinue = vi.fn();

afterEach(cleanup);

describe('NetworkChoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('draws the step in the water with its test ids, at step 3 of 4 on create', () => {
    render(<NetworkChoicePage flowType="create" onBack={onBack} onContinue={onContinue} />);

    expect(screen.getByTestId('onboarding-networks-screen')).toBeTruthy();
    expect(screen.getByTestId('water-column')).toBeTruthy();
    expect(screen.getByTestId('onboarding-networks-option-solana-bitcoin')).toBeTruthy();
    expect(screen.getByTestId('onboarding-networks-option-solana-only')).toBeTruthy();
    const header = screen.getByTestId('onboarding-networks-back');
    const dots = within(header).getByRole('progressbar');
    expect(dots.getAttribute('aria-valuenow')).toBe('3');
    expect(dots.getAttribute('aria-valuemax')).toBe('4');
  });

  it('is step 2 of 3 on recover', () => {
    render(<NetworkChoicePage flowType="recover" onBack={onBack} onContinue={onContinue} />);

    const dots = screen.getByRole('progressbar');
    expect(dots.getAttribute('aria-valuenow')).toBe('2');
    expect(dots.getAttribute('aria-valuemax')).toBe('3');
  });

  it('saves the tapped option and moves on; the header goes back', async () => {
    render(<NetworkChoicePage flowType="create" onBack={onBack} onContinue={onContinue} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('onboarding-networks-option-solana-only'));
    });
    expect(mockSave).toHaveBeenCalledWith(false);
    expect(onContinue).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('screen-header-back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('announces a choice that could not be saved', async () => {
    mockSave.mockRejectedValueOnce(new Error('disk full'));
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<NetworkChoicePage flowType="create" onBack={onBack} onContinue={onContinue} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('onboarding-networks-option-solana-only'));
    });

    expect(screen.getByRole('alert').textContent).toBe('errors.save_failed');
    expect(onContinue).not.toHaveBeenCalled();
    quiet.mockRestore();
  });
});
