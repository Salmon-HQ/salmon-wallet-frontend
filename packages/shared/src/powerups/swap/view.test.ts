import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { swapScreenView } from './view';
import type { UseSwapScreenLogicResult } from './useSwapScreenLogic';

const t = ((key: string, params?: object) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as unknown as TFunction;

const side = (overrides: Partial<UseSwapScreenLogicResult['pay']> = {}) => ({
  token: { address: 'sol', symbol: 'SOL', name: 'Solana', uiAmount: 2, decimals: 9 },
  tokens: [{ address: 'sol', symbol: 'SOL', name: 'Solana', uiAmount: 2, decimals: 9 }],
  loading: false,
  pickerOpen: false,
  openPicker: vi.fn(),
  closePicker: vi.fn(),
  select: vi.fn(),
  subtitle: '2 SOL',
  ...overrides,
});

const logic = (overrides: Partial<UseSwapScreenLogicResult> = {}): UseSwapScreenLogicResult => ({
  pay: side(),
  receive: side({ token: null, subtitle: '' }),
  amount: '1',
  shortcuts: { options: [], selected: '', select: vi.fn(), onAmountChange: vi.fn() },
  fiatLine: '≈ 1 USD',
  canSubmit: true,
  isConfirming: false,
  error: null,
  blocker: null,
  unavailable: null,
  submit: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('swapScreenView', () => {
  it('names a side by its token, or asks for one', () => {
    const view = swapScreenView(logic(), t);
    expect(view.payRow.title).toBe('SOL');
    expect(view.receiveRow.title).toBe('swap.select_token');
    expect(view.submitButton.disabled).toBe(false);
    expect(view.unavailable).toBeNull();
    expect(view.empty).toBeNull();
  });

  it('translates a keyed message with its params', () => {
    const view = swapScreenView(
      logic({
        blocker: { key: 'swap.errors.insufficientSolFor', params: { amount: '0.01' } },
        error: 'swap.errors.buildFailed',
      }),
      t
    );
    expect(view.blockerText).toBe('swap.errors.insufficientSolFor:{"amount":"0.01"}');
    expect(view.errorText).toBe('swap.errors.buildFailed');
  });

  it('replaces the form when the caller is refused, and when nothing is held', () => {
    expect(swapScreenView(logic({ unavailable: 'region' }), t).unavailable).toEqual({
      testID: 'swap-unavailable-region',
      title: 'powerups.unavailable.region',
    });
    expect(swapScreenView(logic({ pay: side({ tokens: [] }) }), t).empty?.testID).toBe(
      'swap-empty'
    );
    expect(swapScreenView(logic({ pay: side({ tokens: [], loading: true }) }), t).empty).toBeNull();
  });
});
