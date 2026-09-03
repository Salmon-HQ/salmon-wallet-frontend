/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { KeyValueRow } from './KeyValueRow';

afterEach(cleanup);

describe('KeyValueRow', () => {
  it('renders the pair and inks the value by tone', () => {
    renderInMode(
      'dark',
      <KeyValueRow label="Network fee" value="0.000005 SOL" valueTone="danger" />
    );

    expect(screen.getByText('Network fee')).toBeTruthy();
    expect(screen.getByText('0.000005 SOL').style.color).toBe(
      asRenderedColor(createSemantic('dark').status.danger)
    );
  });

  it('defaults the value to primary ink and the label to secondary, in both modes', () => {
    renderInMode('dark', <KeyValueRow label="Available" value="12.5 SOL" />);
    expect(screen.getByText('12.5 SOL').style.color).toBe(
      asRenderedColor(createSemantic('dark').text.primary)
    );
    expect(screen.getByText('Available').style.color).toBe(
      asRenderedColor(createSemantic('dark').text.secondary)
    );
    cleanup();

    renderInMode('light', <KeyValueRow label="Available" value="12.5 SOL" />);
    expect(screen.getByText('12.5 SOL').style.color).toBe(
      asRenderedColor(createSemantic('light').text.primary)
    );
  });

  it('renders a node value and the trailing action as they arrive', () => {
    renderInMode(
      'dark',
      <KeyValueRow
        label="Address"
        value={<span data-testid="addr">9xQe…4f2</span>}
        action={<button type="button">Copy</button>}
      />
    );

    expect(screen.getByTestId('addr')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });
});
