/**
 * @vitest-environment jsdom
 *
 * Welcome says its name and its lema (owner, 2026-08-18, superseding "only
 * the fish"): the wordmark under the fish, the slogan under the wordmark —
 * and exactly one of them is the screen's heading.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// The real @salmon/shared barrel pulls in react-native, which Vite cannot
// parse; the tokens the page and the layout read are runtime-agnostic.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/theme')),
  ...(await vi.importActual('../../../../shared/src/utils/scaling')),
  ...(await vi.importActual('../../../../shared/src/types/ui')),
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

// The water is not under test, and its shaders drag their own dependencies.
vi.mock('../WaterColumn', () => ({
  WaterColumn: () => null,
  waterColumnHost: {},
}));

import { wordmarkText } from '../../../../shared/src/theme';
import { SelectOptionsPage } from './SelectOptionsPage';

afterEach(cleanup);

const renderPage = () =>
  render(
    <SelectOptionsPage
      onCreateWallet={() => undefined}
      onRecoverWallet={() => undefined}
      hasAccounts={false}
    />
  );

describe('SelectOptionsPage', () => {
  it('shows the fish, the wordmark and the slogan', () => {
    renderPage();

    expect(screen.getByTestId('welcome-brand-mark')).toBeTruthy();
    expect(screen.getByTestId('brand-mark')).toBeTruthy();
    expect(screen.getByTestId('wordmark')).toBeTruthy();
    expect(screen.getByTestId('welcome-slogan').textContent).toBe('Open code. Open ownership.');
  });

  it('announces "Salmon" once — the wordmark is the heading, the fish is not', () => {
    renderPage();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toBe(screen.getByTestId('wordmark'));
    expect(headings[0].getAttribute('aria-label')).toBe(wordmarkText);
    // The fish wrapper no longer duplicates the announcement.
    expect(screen.getByTestId('welcome-brand-mark').getAttribute('aria-label')).toBeNull();
    expect(screen.getByTestId('welcome-brand-mark').getAttribute('role')).toBeNull();
  });
});
