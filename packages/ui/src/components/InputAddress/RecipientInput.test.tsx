/**
 * @vitest-environment jsdom
 *
 * The recipient field draws the verdict it is handed — edge and mark per
 * validation state — and pastes from the clipboard into the caller's hand.
 * It never judges an address itself.
 */
import React from 'react';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

import { RecipientInput } from './RecipientInput';

afterEach(cleanup);

const renderField = (
  props: Partial<React.ComponentProps<typeof RecipientInput>> = {},
  mode: 'dark' | 'light' = 'dark'
) =>
  renderInMode(
    mode,
    <RecipientInput
      value=""
      onChangeText={vi.fn()}
      placeholder="Address"
      validationState="idle"
      isValidating={false}
      {...props}
    />
  );

describe('RecipientInput — the verdict, drawn', () => {
  it('shows no mark while idle or while the validator is still working', () => {
    renderField({ value: 'abc', validationState: 'loading', isValidating: true });
    expect(screen.queryByTestId('send-recipient-mark')).toBeNull();
  });

  it('marks a judged address with the state ink, on the edge and the glyph', () => {
    renderField({ value: 'abc', validationState: 'invalid' });
    const danger = asRenderedColor(createSemantic('dark').status.danger);
    expect(screen.getByTestId('send-recipient-mark').style.color).toBe(danger);
    expect(screen.getByTestId('send-recipient-field').style.borderColor).toBe(danger);
  });

  it('reads the live mode — the success ink is light green in light', () => {
    renderField({ value: 'abc', validationState: 'valid' }, 'light');
    expect(screen.getByTestId('send-recipient-mark').style.color).toBe(
      asRenderedColor(createSemantic('light').status.success)
    );
  });

  it('pastes the clipboard into the caller, trimmed', async () => {
    const onChangeText = vi.fn();
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { readText: vi.fn(async () => '  addr  ') },
    });
    renderField({ onChangeText });

    await act(async () => {
      fireEvent.click(screen.getByTestId('send-paste-button'));
    });

    expect(onChangeText).toHaveBeenCalledWith('addr');
    vi.unstubAllGlobals();
  });

  it('takes the caller prefix for its own test ids', () => {
    renderField({ testIDPrefix: 'address-book' });
    expect(screen.getByTestId('address-book-recipient-input')).toBeTruthy();
    expect(screen.getByTestId('address-book-paste-button')).toBeTruthy();
  });
});
