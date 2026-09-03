/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { AccountAvatar } from './AccountAvatar';

afterEach(cleanup);

describe('AccountAvatar', () => {
  it('draws the initials when there is no picture', () => {
    renderInMode('dark', <AccountAvatar name="Main Wallet" active={false} testID="avatar" />);
    expect(screen.getByTestId('avatar').textContent).toBe('MW');
  });

  it('draws the picture, and falls back to the initials when it fails to load', () => {
    renderInMode(
      'dark',
      <AccountAvatar name="Main Wallet" avatarUrl="https://x/y.png" active testID="avatar" />
    );
    const img = screen.getByTestId('avatar').querySelector('img') as HTMLImageElement;
    expect(img.src).toBe('https://x/y.png');
    fireEvent.error(img);
    expect(screen.getByTestId('avatar').querySelector('img')).toBeNull();
    expect(screen.getByTestId('avatar').textContent).toBe('MW');
  });
});
