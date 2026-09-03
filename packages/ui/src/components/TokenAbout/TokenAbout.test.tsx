/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSemantic } from '@salmon/shared';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { TokenAbout } from './TokenAbout';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

const writeText = vi.fn(async () => {});

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText } });
  writeText.mockClear();
});
afterEach(cleanup);

describe('TokenAbout', () => {
  it('renders nothing when the asset has nothing to say', () => {
    const { container } = renderInMode('dark', <TokenAbout />);
    expect(container.firstChild).toBeNull();
  });

  it('copies the full contract address from the row that prints the short one', async () => {
    renderInMode(
      'dark',
      <TokenAbout
        contractAddress="So11111111111111111111111111111111111111112"
        contractAddressShort="So1111…1112"
      />
    );
    expect(screen.getByText('So1111…1112')).toBeTruthy();
    fireEvent.click(screen.getByTestId('token-detail-contract-address'));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('So11111111111111111111111111111111111111112')
    );
  });

  it.each(['dark', 'light'] as const)(
    'reads the description in the %s mode’s secondary ink',
    (mode) => {
      renderInMode(
        mode,
        <TokenAbout description="Legendary fish." website="https://salmon.example" />
      );
      const description = screen.getByText('Legendary fish.') as HTMLElement;
      expect(description.style.color).toBe(asRenderedColor(createSemantic(mode).text.secondary));
      expect(screen.getByTestId('token-detail-website')).toBeTruthy();
    }
  );
});
