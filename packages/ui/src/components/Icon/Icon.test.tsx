/**
 * @vitest-environment jsdom
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `@salmon/shared` re-exports React Native types through its barrel, which the
// DOM test runner cannot parse. Stub the two values this component reads.
vi.mock('@salmon/shared', () => ({
  colors: { text: { primary: '#EDF1F7' } },
  getIconSize: (size: string | number = 'md') =>
    typeof size === 'number' ? size : { xs: 12, sm: 16, md: 20, lg: 24, xl: 32 }[size],
}));

const { Icon } = await import('./Icon');
const { iconSize } = await import('../../icons');

const ALL_NAMES = [
  'chevron-down',
  'chevron-up',
  'chevron-right',
  'chevron-left',
  'close',
  'back',
  'send',
  'receive',
  'copy',
  'refresh',
  'settings',
  'qr-code',
  'scan',
  'eye',
  'eye-off',
  'lock',
  'unlock',
  'shield',
  'key',
  'fingerprint',
  'wallet',
  'activity',
  'swap',
  'checkmark',
  'checkmark-circle',
  'alert',
  'alert-circle',
  'info',
  'info-circle',
  'diamond',
  'people',
  'layers',
  'image',
  'game-controller',
  'analytics',
  'trending-up',
  'trending-down',
  'cash',
  'card',
  'cloud',
  'star',
  'heart',
  'tag',
  'add',
  'remove',
  'search',
  'menu',
  'more',
  'link',
  'external-link',
] as const;

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('no glyph rendered');
  return svg;
}

afterEach(cleanup);

describe('Icon', () => {
  it('resolves every semantic name to a glyph', () => {
    for (const name of ALL_NAMES) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(svgOf(container).querySelector('path')).not.toBeNull();
      unmount();
    }
  });

  it('lifts a size below the 16px floor up to it', () => {
    // `xs` is 12px in the shared scale — below the floor the stroke survives.
    const { container } = render(<Icon name="wallet" size="xs" />);
    expect(svgOf(container).getAttribute('width')).toBe(String(iconSize.sm));
  });

  it('passes a size on the ramp through untouched', () => {
    const { container } = render(<Icon name="wallet" size={iconSize.xl} />);
    expect(svgOf(container).getAttribute('width')).toBe(String(iconSize.xl));
  });

  it('draws at regular weight unless a caller says otherwise', () => {
    const { container } = render(<Icon name="checkmark-circle" />);
    // Phosphor's fill weight is a single solid path; regular is stroked-looking
    // geometry. The reliable signal is that no `duotone` opacity layer exists.
    expect(svgOf(container).querySelector('[opacity]')).toBeNull();
  });
});
