/**
 * The screen is a thin twin: the owner goes to the shared logic, the logic
 * to the shared block builder, the blocks to the kit list. What each state
 * shows is `skrBlocks`'s test (packages/shared).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockLogic = jest.fn();
const mockBlocks = jest.fn();
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
}));
jest.mock('@salmon/shared/powerups', () => ({
  useSkrScreenLogic: (params: unknown) => mockLogic(params),
  skrBlocks: (logic: unknown, t: unknown) => mockBlocks(logic, t),
}));
jest.mock('../BlockList', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    BlockList: ({ testID, blocks }: { testID?: string; blocks: { key: string }[] }) => (
      <Text testID={testID}>{blocks.map((block) => block.key).join(',')}</Text>
    ),
  };
});

import { SkrScreen } from './SkrScreen';

describe('SkrScreen', () => {
  it("draws the blocks shared builds from the owner's position", () => {
    const logic = { state: 'ready' };
    mockLogic.mockReturnValue(logic);
    mockBlocks.mockReturnValue([{ key: 'header' }, { key: 'stake' }]);

    render(<SkrScreen publicKey="Owner" />);

    expect(mockLogic).toHaveBeenCalledWith({ publicKey: 'Owner' });
    expect(mockBlocks).toHaveBeenCalledWith(logic, expect.any(Function));
    expect(screen.getByTestId('skr-screen').props.children).toBe('header,stake');
  });
});
