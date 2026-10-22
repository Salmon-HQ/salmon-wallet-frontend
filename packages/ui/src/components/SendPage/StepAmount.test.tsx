/**
 * @vitest-environment jsdom
 *
 * The amount screen opens Review only on an amount the transfer can send as
 * typed: inside the balance and within the token's decimal places.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { StepAmount } from './StepAmount';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  // The fiat line reads the currency provider; this screen's rule does not.
  useFiatLine: () => null,
}));
vi.mock('../DepthBackground', () => ({ DepthBackground: () => null }));
vi.mock('../ScalesBackground', () => ({ ScalesBackground: () => null }));

const usdc = { address: 'usdc', name: 'USD Coin', symbol: 'USDC', decimals: 6, uiAmount: 5 };

const renderAmount = (amount: string, token: object = usdc, setAmount = vi.fn()) =>
  renderInMode(
    'dark',
    <StepAmount
      blockchain="solana"
      token={token as never}
      liveBalance={5}
      nativeBalance={1}
      recipient={{ address: 'Dest' }}
      amount={amount}
      setAmount={setAmount}
      estimatedFee={null}
      estimateFee={vi.fn()}
      onReview={vi.fn()}
      onBack={vi.fn()}
    />
  );

const review = () => screen.getByTestId('send-review-button') as HTMLButtonElement;

afterEach(() => cleanup());

describe('StepAmount', () => {
  it('opens Review on an amount inside the balance', () => {
    renderAmount('1.5');
    expect(review().disabled).toBe(false);
  });

  it('keeps Review shut on an amount finer than the token', () => {
    renderAmount('0.0000005');
    expect(review().disabled).toBe(true);
  });

  // A digit past the token's places is simply not taken (owner, option a).
  it("takes no digit past the token's decimal places", () => {
    const setAmount = vi.fn();
    renderAmount('', usdc, setAmount);

    fireEvent.change(screen.getByTestId('send-amount-input'), { target: { value: '1.1234567' } });

    expect(setAmount).toHaveBeenLastCalledWith('1.123456');
  });

  it('takes no separator for a token with no decimals', () => {
    const setAmount = vi.fn();
    renderAmount('', { ...usdc, decimals: 0 }, setAmount);

    fireEvent.change(screen.getByTestId('send-amount-input'), { target: { value: '5.' } });

    expect(setAmount).toHaveBeenLastCalledWith('5');
  });
});
