/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { WarningNotice } from './WarningNotice';

afterEach(cleanup);

describe('WarningNotice', () => {
  it('renders title and body, and announces as an alert', () => {
    renderInMode('dark', <WarningNotice title="Heads up">Something went wrong</WarningNotice>);

    expect(screen.getByText('Heads up')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('renders the optional action slot and keeps it interactive', () => {
    const onRetry = vi.fn();
    renderInMode(
      'dark',
      <WarningNotice
        tone="warning"
        title="Stalled"
        action={<button onClick={onRetry}>Check now</button>}
      >
        Body text
      </WarningNotice>
    );

    fireEvent.click(screen.getByText('Check now'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders no action container when no action is given', () => {
    renderInMode('dark', <WarningNotice title="No action" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('takes the danger accent by default, in the dark tokens', () => {
    renderInMode('dark', <WarningNotice title="Danger" testID="notice" />);
    expect(screen.getByTestId('notice').style.borderColor).toBe(
      asRenderedColor(createSemantic('dark').status.danger)
    );
  });

  it('takes the warning accent for the warning tone, in light mode', () => {
    const dark = createSemantic('dark').status.warning;
    const light = createSemantic('light').status.warning;
    expect(dark).not.toBe(light);

    renderInMode('light', <WarningNotice tone="warning" title="Warn" testID="notice" />);
    expect(screen.getByTestId('notice').style.borderColor).toBe(asRenderedColor(light));
  });
});
