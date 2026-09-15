/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ level }: { level?: string }) => <svg data-testid="svg" data-level={level} />,
}));
vi.mock('../BrandMark', () => ({
  BrandMark: () => <svg data-testid="brand-mark" />,
}));

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { QRCode } from './QRCode';

afterEach(cleanup);

describe('QRCode brand knockout', () => {
  it('draws nothing over a plain code', () => {
    renderInMode('dark', <QRCode testID="qr" value="x" size={100} />);
    expect(screen.getByTestId('svg').getAttribute('data-level')).toBe('M');
    expect(screen.queryByTestId('qr-logo')).toBeNull();
  });

  it('centres the mark on a knockout in the code ground and forces level H', () => {
    renderInMode('light', <QRCode testID="qr" value="x" size={100} brandKnockout />);
    expect(screen.getByTestId('svg').getAttribute('data-level')).toBe('H');
    const knockout = screen.getByTestId('qr-logo');
    expect(knockout.style.width).toBe('24px');
    expect(knockout.style.backgroundColor).toBe(
      asRenderedColor(createSemantic('light').text.primary)
    );
    expect(screen.getByTestId('brand-mark')).toBeTruthy();
  });
});
