/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/styled', () => ({
  styled: (Component: React.ElementType) => () => Component,
}));

vi.mock('@salmon/shared', () => ({
  colors: {
    status: {
      warning: '#fc0',
      warningBackground: '#fc02',
      error: '#f43',
      errorBackground: '#f432',
    },
    text: { primary: '#fff' },
  },
  borderRadius: { lg: 16 },
  fontSize: { sm: 14 },
  fontWeight: { semibold: 600 },
  spacing: { sm: 8, md: 12 },
}));

import { WarningNotice } from './WarningNotice';

describe('WarningNotice', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders title and body', () => {
    render(<WarningNotice title="Heads up">Something went wrong</WarningNotice>);

    expect(screen.getByText('Heads up')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('renders the optional action slot and keeps it interactive', () => {
    const onRetry = vi.fn();
    render(
      <WarningNotice
        tone="warning"
        title="Stalled"
        action={<button onClick={onRetry}>Check now</button>}
      >
        Body text
      </WarningNotice>,
    );

    fireEvent.click(screen.getByText('Check now'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders no action container when no action is given', () => {
    render(<WarningNotice title="No action" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
