/**
 * A receipt row is read as a pair, so the value's ink is the whole point:
 * a fee, a success amount and a failure must not all be the same colour.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { semantic } from '@salmon/shared';
import { KeyValueRow } from './KeyValueRow';

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

describe('KeyValueRow', () => {
  it('renders the pair and inks the value by tone', () => {
    render(<KeyValueRow label="Network fee" value="0.000005 SOL" valueTone="danger" />);

    expect(screen.getByText('Network fee')).toBeTruthy();
    const value = screen.getByText('0.000005 SOL');
    expect(flatten(value.props.style).color).toBe(semantic.status.danger);
  });

  it('defaults the value to primary ink and the label to secondary', () => {
    render(<KeyValueRow label="Available" value="12.5 SOL" />);

    expect(flatten(screen.getByText('12.5 SOL').props.style).color).toBe(semantic.text.primary);
    expect(flatten(screen.getByText('Available').props.style).color).toBe(semantic.text.secondary);
  });
});
