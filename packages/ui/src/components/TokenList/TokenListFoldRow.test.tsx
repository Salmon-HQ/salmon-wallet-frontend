/**
 * @vitest-environment jsdom
 *
 * The disclosure that closes a folded token list: it says how many tokens wait
 * behind it, says "Show less" once open, and announces which of the two it is.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';

vi.mock('react-i18next', async () => {
  const i18next = (await import('i18next')).default.createInstance();
  const en = (await import('../../../../shared/src/locales/en/translation.json')).default;
  await i18next.init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
  return { useTranslation: () => ({ t: i18next.t.bind(i18next) }) };
});

const { TokenListFoldRow } = await import('./TokenListFoldRow');

afterEach(cleanup);

describe('TokenListFoldRow', () => {
  it('says how many tokens are folded and announces itself collapsed', () => {
    renderInMode('dark', <TokenListFoldRow foldedCount={7} expanded={false} onToggle={() => {}} />);

    const row = screen.getByTestId('token-list-fold-row');
    expect(screen.getByText('Show 7 more tokens')).toBeTruthy();
    expect(row.getAttribute('aria-expanded')).toBe('false');
  });

  it('reads "Show less" and announces itself expanded once open', () => {
    renderInMode('dark', <TokenListFoldRow foldedCount={7} expanded onToggle={() => {}} />);

    expect(screen.getByText('Show less')).toBeTruthy();
    expect(screen.getByTestId('token-list-fold-row').getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles on press', () => {
    const onToggle = vi.fn();
    renderInMode('dark', <TokenListFoldRow foldedCount={2} expanded={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more tokens' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
