/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../SettingsPanelContent', () => ({
  SettingsPanelContent: ({
    title,
    onBack,
    children,
    testID,
  }: {
    title: string;
    onBack: () => void;
    children: React.ReactNode;
    testID?: string;
  }) => (
    <div data-testid={testID}>
      <button data-testid="back" onClick={onBack}>
        {title}
      </button>
      {children}
    </div>
  ),
}));
vi.mock('../BlockList', () => ({
  BlockList: ({ blocks }: { blocks: { key: string }[] }) => (
    <div data-testid="body">{blocks.map((b) => b.key).join(',')}</div>
  ),
}));

import { StakeAccountsPage } from './StakeAccountsPage';

afterEach(cleanup);

describe('StakeAccountsPage', () => {
  it('puts the body in a titled panel with a way back', () => {
    const onBack = vi.fn();
    render(
      <StakeAccountsPage
        state="ready"
        cards={[{ key: 'E5zH', title: 'Salmon Wallet', rows: [] }]}
        onRetry={vi.fn()}
        onBack={onBack}
      />
    );

    expect(screen.getByTestId('staking-screen')).toBeTruthy();
    expect(screen.getByText('staking.detail.title')).toBeTruthy();
    expect(screen.getByTestId('body').textContent).toBe('E5zH');
    fireEvent.click(screen.getByTestId('back'));
    expect(onBack).toHaveBeenCalled();
  });
});
