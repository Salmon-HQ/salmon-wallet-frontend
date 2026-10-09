/**
 * @vitest-environment jsdom
 *
 * The page is a thin twin: the owner goes to the shared logic, the logic to
 * the shared block builder, the blocks to the kit list. What each state
 * shows is `skrBlocks`'s test (packages/shared).
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockLogic = vi.fn();
const mockBlocks = vi.fn();
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@salmon/shared/powerups', () => ({
  useSkrScreenLogic: (params: unknown) => mockLogic(params),
  skrBlocks: (logic: unknown, t: unknown) => mockBlocks(logic, t),
}));
vi.mock('../BlockList', () => ({
  BlockList: ({ testID, blocks }: { testID?: string; blocks: { key: string }[] }) => (
    <div data-testid={testID}>{blocks.map((block) => block.key).join(',')}</div>
  ),
}));

import { SkrPage } from './SkrPage';

afterEach(cleanup);

describe('SkrPage', () => {
  it("draws the blocks shared builds from the owner's position", () => {
    const logic = { state: 'ready' };
    mockLogic.mockReturnValue(logic);
    mockBlocks.mockReturnValue([{ key: 'header' }, { key: 'stake' }]);

    render(<SkrPage publicKey="Owner" />);

    expect(mockLogic).toHaveBeenCalledWith({ publicKey: 'Owner' });
    expect(mockBlocks).toHaveBeenCalledWith(logic, expect.any(Function));
    expect(screen.getByTestId('skr-screen').textContent).toBe('header,stake');
  });
});
