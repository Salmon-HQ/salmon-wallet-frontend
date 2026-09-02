/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, screen } from '@testing-library/react';

import { renderInMode } from '../../test/renderInMode';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

// The QR encoder walks a canvas, which jsdom does not provide; render a
// prop-carrying stand-in so the suite can assert what the sheet asks of the
// code (e.g. level-H).
vi.mock('../QRCode', () => ({
  QRCode: ({ ecLevel }: { ecLevel?: string }) => <div data-testid="qr" data-ec-level={ecLevel} />,
}));

// The mark reads `markPaths` from the (mocked) shared barrel; the sheet only
// needs it to exist.
vi.mock('../BrandMark', () => ({
  BrandMark: () => <svg data-testid="brand-mark" />,
}));

vi.mock('../FleshBackground', () => ({
  FleshBackground: () => null,
}));

vi.mock('../WarningNotice', () => ({
  WarningNotice: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <div role="alert">
      <span>{title}</span>
      <span>{children}</span>
    </div>
  ),
}));

import { ReceiveSheet } from './ReceiveSheet';

const ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

afterEach(cleanup);

describe('ReceiveSheet chain identity', () => {
  it('names the chain in a labelled badge', () => {
    renderInMode(
      'dark',
      <ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="solana" />
    );

    expect(screen.getByTestId('receive-chain-badge').textContent).toBe(
      'token.send.blockchainAddress:Solana'
    );
  });

  it('shows no written address — the code is the address, the button hands it over', () => {
    renderInMode(
      'dark',
      <ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="solana" />
    );

    expect(screen.queryByTestId('receive-address')).toBeNull();
    expect(screen.queryByText(ADDRESS)).toBeNull();
    expect(screen.getByTestId('receive-copy-button')).toBeTruthy();
  });

  it('warns that only assets on that chain may be sent to this address', () => {
    renderInMode(
      'dark',
      <ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="bitcoin" />
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('token.receive.networkOnlyTitle:Bitcoin');
    expect(alert.textContent).toContain('token.receive.networkOnlyBody:Bitcoin');
  });
});

describe('ReceiveSheet QR brand mark', () => {
  it('centers the salmon mark on a knockout over a level-H code', () => {
    renderInMode(
      'dark',
      <ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="solana" />
    );

    // The mark hides modules, so the code must carry level-H redundancy.
    expect(screen.getByTestId('qr').getAttribute('data-ec-level')).toBe('H');
    expect(screen.getByTestId('receive-qr-logo')).toBeTruthy();
    expect(screen.getByTestId('brand-mark')).toBeTruthy();
  });
});
