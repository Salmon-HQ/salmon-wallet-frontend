import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/client';
import { describePowerupBuildError } from './errors';
import { describeSwapBuildError } from '../swap/errors';

const api = (status: number, code?: string) => new ApiError('x', status, code);

describe('describePowerupBuildError — spec 029 §5.3', () => {
  it.each([
    [403, 'region_restricted', { kind: 'unavailable', reason: 'region' }],
    [403, 'wallet_restricted', { kind: 'unavailable', reason: 'wallet' }],
    [404, 'not_found', { kind: 'message', message: 'powerups.disabled.maintenance' }],
    [404, 'no_route', { kind: 'message', message: 'transaction.errors.noRoute' }],
    [400, 'missing_parameter', { kind: 'message', message: 'transaction.errors.buildFailed' }],
    [502, 'provider_program_mismatch', { kind: 'message', message: 'transaction.errors.buildFailed' }],
    [502, 'provider_signer_mismatch', { kind: 'message', message: 'transaction.errors.buildFailed' }],
    [422, 'simulation_failed', { kind: 'message', message: 'transaction.errors.simulationFailed' }],
    [503, 'simulation_unavailable', { kind: 'message', message: 'transaction.errors.networkBusy' }],
    [503, 'network_catalog_unavailable', { kind: 'message', message: 'transaction.errors.networkBusy' }],
    [500, undefined, { kind: 'message', message: 'transaction.errors.networkBusy' }],
    [0, undefined, { kind: 'message', message: 'transaction.errors.networkBusy' }],
  ])('%s %s', (status, code, expected) => {
    expect(describePowerupBuildError(api(status, code))).toEqual(expected);
  });

  it('lets a Powerup extend the table and name its own fallback', () => {
    expect(
      describePowerupBuildError(api(400, 'note_too_long'), {
        codes: { note_too_long: 'memo.errors.tooLong' },
        fallback: 'memo.errors.buildFailed',
      })
    ).toEqual({ kind: 'message', message: 'memo.errors.tooLong' });
    expect(describePowerupBuildError(new Error('?'), { fallback: 'memo.errors.buildFailed' })).toEqual(
      { kind: 'message', message: 'memo.errors.buildFailed' }
    );
  });

  it('keeps the swap reading its own codes over the shared ones', () => {
    expect(describeSwapBuildError(api(400, 'invalid_parameter'))).toEqual({
      kind: 'message',
      message: 'swap.errors.quoteFailed',
    });
    expect(describeSwapBuildError(new Error('?'))).toEqual({
      kind: 'message',
      message: 'swap.errors.quoteFailed',
    });
  });
});
