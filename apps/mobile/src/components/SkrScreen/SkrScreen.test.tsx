import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockLogic = jest.fn();
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
}));
jest.mock('@salmon/shared/powerups', () => ({
  useSkrScreenLogic: (params: unknown) => mockLogic(params),
  skrBlocks: jest.requireActual('@salmon/shared/src/powerups/skr/skrBlocks').skrBlocks,
}));
jest.mock('../FactsCard', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    FactsCard: ({
      title,
      rows,
      testID,
    }: {
      title?: string;
      rows: { key: string }[];
      testID?: string;
    }) => <Text testID={testID}>{`${title ?? ''}:${rows.map((r) => r.key).join(',')}`}</Text>,
  };
});
jest.mock('../StateBlock', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    StateBlock: ({
      title,
      testID,
      onRetry,
    }: {
      title: string;
      testID?: string;
      onRetry?: () => void;
    }) => (
      <TouchableOpacity testID={testID} onPress={onRetry}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});
jest.mock('../SectionLabel', () => {
  const { Text } = jest.requireActual('react-native');
  return { SectionLabel: ({ children }: { children: string }) => <Text>{children}</Text> };
});
jest.mock('../TokenList', () => ({ TokenListItem: () => null }));
jest.mock('../SkeletonRow', () => {
  const { View } = jest.requireActual('react-native');
  return { SkeletonRow: () => <View testID="skeleton" /> };
});

import { SkrScreen } from './SkrScreen';

const ready = {
  state: 'ready',
  summary: [{ key: 'liquid' }, { key: 'staked' }],
  history: [{ key: 'h-1' }],
  refresh: jest.fn(),
};

describe('SkrScreen', () => {
  it('shows the facts and the rewards of the owner it is given', () => {
    mockLogic.mockReturnValue(ready);
    render(<SkrScreen publicKey="Owner" />);

    expect(mockLogic).toHaveBeenCalledWith({ publicKey: 'Owner' });
    expect(screen.getByTestId('skr-facts').props.children).toBe('skr.facts.title:liquid,staked');
    expect(screen.getByTestId('skr-history').props.children).toBe(':h-1');
  });

  it('explains an empty history', () => {
    mockLogic.mockReturnValue({ ...ready, history: [] });
    render(<SkrScreen publicKey="Owner" />);

    expect(screen.getByText('skr.history.empty')).toBeTruthy();
  });

  it('waits with skeletons, never a spinner', () => {
    mockLogic.mockReturnValue({ ...ready, state: 'loading' });
    render(<SkrScreen publicKey="Owner" />);

    expect(screen.getByTestId('skeleton')).toBeTruthy();
  });

  it('offers a retry when the read failed', () => {
    const refresh = jest.fn();
    mockLogic.mockReturnValue({ ...ready, state: 'error', refresh });
    render(<SkrScreen publicKey="Owner" />);

    fireEvent.press(screen.getByTestId('skr-error'));

    expect(refresh).toHaveBeenCalled();
  });

  it('says so when the wallet has no SKR', () => {
    mockLogic.mockReturnValue({ ...ready, state: 'empty' });
    render(<SkrScreen publicKey="Owner" />);

    expect(screen.getByText('skr.empty.title')).toBeTruthy();
  });
});
