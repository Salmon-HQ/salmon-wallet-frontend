/**
 * @vitest-environment jsdom
 *
 * The "Choose your networks" step both apps draw during setup: two options,
 * neither chosen, and one tap that saves the choice and moves on.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saveBitcoinChoice = vi.fn<(enabled: boolean) => Promise<void>>();

vi.mock('../hooks/useUserConfig', () => ({
  saveBitcoinChoice: (enabled: boolean) => saveBitcoinChoice(enabled),
}));

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

import {
  createNetworkChoiceScreen,
  type NetworkChoiceScreenKit,
} from './createNetworkChoiceScreen';

// Plain stand-ins for the platform parts: the step's decisions are what is
// under test, not how each platform draws a row.
const kit: NetworkChoiceScreenKit = {
  Layout: ({ testID, chrome, mark, title, body, secondary, action }) => (
    <main data-testid={testID}>
      {chrome}
      {mark}
      {title}
      {body}
      {secondary !== undefined && <div data-testid="slot-secondary" />}
      {action !== undefined && <div data-testid="slot-action" />}
    </main>
  ),
  Title: ({ children }) => <h1>{children}</h1>,
  Header: ({ testID, onBack, stepIndicator }) => (
    <header data-testid={testID}>
      <button type="button" onClick={onBack}>
        back
      </button>
      {stepIndicator && (
        <span data-testid="dots">{`${stepIndicator.currentStep} of ${stepIndicator.totalSteps}`}</span>
      )}
    </header>
  ),
  SettingsSelectorList: ({
    items,
    getKey,
    isSelected,
    onSelect,
    getPrimaryText,
    getSecondaryText,
    renderLeadingElement,
    testIdPrefix,
  }) => (
    <div>
      {items.map((item) => (
        <button
          key={getKey(item)}
          type="button"
          data-testid={`${testIdPrefix}-${getKey(item)}`}
          data-well={renderLeadingElement?.(item) === null ? 'none' : 'drawn'}
          aria-pressed={isSelected(item)}
          onClick={() => onSelect(item)}
        >
          <span>{getPrimaryText(item)}</span>
          <span>{getSecondaryText?.(item)}</span>
        </button>
      ))}
    </div>
  ),
  mark: <i data-testid="mark" />,
};
const NetworkChoiceScreen = createNetworkChoiceScreen(kit);

const BOTH = 'onboarding-networks-option-solana-bitcoin';
const ONLY = 'onboarding-networks-option-solana-only';

const onBack = vi.fn();
const onContinue = vi.fn();
const draw = (flowType: 'create' | 'recover' = 'create') =>
  render(<NetworkChoiceScreen flowType={flowType} onBack={onBack} onContinue={onContinue} />);

beforeEach(() => {
  saveBitcoinChoice.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('createNetworkChoiceScreen', () => {
  it('asks the question with both options and chooses neither', () => {
    draw();

    expect(screen.getByTestId('onboarding-networks-screen')).toBeTruthy();
    expect(screen.getByTestId('onboarding-networks-back')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Choose your networks' })).toBeTruthy();
    expect(screen.getByTestId('mark')).toBeTruthy();
    expect(screen.getByTestId(BOTH).textContent).toBe(
      'Solana + BitcoinUse Solana and Bitcoin in one wallet.'
    );
    expect(screen.getByTestId(ONLY).textContent).toBe(
      'Solana onlyJust Solana. You can add Bitcoin later in Settings.'
    );
    for (const id of [BOTH, ONLY]) {
      expect(screen.getByTestId(id).getAttribute('aria-pressed')).toBe('false');
      expect(screen.getByTestId(id).getAttribute('data-well')).toBe('none');
    }
  });

  it('has no Continue button: a row is the action', () => {
    draw();

    expect(screen.queryByTestId('slot-action')).toBeNull();
    expect(screen.queryByTestId('slot-secondary')).toBeNull();
    expect(screen.queryByRole('button', { name: /continue|next/i })).toBeNull();
  });

  it.each([
    ['create', '3 of 4'],
    ['recover', '2 of 3'],
  ] as const)('draws the %s flow at step %s', (flowType, dots) => {
    draw(flowType);

    expect(screen.getByTestId('dots').textContent).toBe(dots);
  });

  it('saves "Solana only" and moves on only once the choice is stored', async () => {
    let finish = () => {};
    saveBitcoinChoice.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      })
    );
    draw();

    fireEvent.click(screen.getByTestId(ONLY));
    expect(saveBitcoinChoice).toHaveBeenCalledWith(false);
    expect(onContinue).not.toHaveBeenCalled();

    await act(async () => finish());
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('saves "Solana + Bitcoin" as Bitcoin on', async () => {
    draw();

    await act(async () => {
      fireEvent.click(screen.getByTestId(BOTH));
    });

    expect(saveBitcoinChoice).toHaveBeenCalledWith(true);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('saves once and moves on once when tapped twice quickly', async () => {
    draw();

    await act(async () => {
      fireEvent.click(screen.getByTestId(ONLY));
      fireEvent.click(screen.getByTestId(BOTH));
    });

    expect(saveBitcoinChoice).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('stays when the choice could not be saved, and a second tap saves again', async () => {
    saveBitcoinChoice.mockRejectedValueOnce(new Error('disk full'));
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    draw();

    await act(async () => {
      fireEvent.click(screen.getByTestId(ONLY));
    });
    expect(onContinue).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByTestId(ONLY));
    });
    expect(saveBitcoinChoice).toHaveBeenCalledTimes(2);
    expect(onContinue).toHaveBeenCalledTimes(1);
    quiet.mockRestore();
  });

  it('goes back', () => {
    draw();

    fireEvent.click(screen.getByRole('button', { name: 'back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
