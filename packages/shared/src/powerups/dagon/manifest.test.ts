import { describe, expect, it } from 'vitest';
import {
  ASSOCIATED_TOKEN_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
} from '../../core/verify';
import { POWERUPS, isPowerupOnNetwork } from '../registry';
import { dagonManifest } from './manifest';

describe('dagonManifest — spec 043 FR-002, FR-004', () => {
  it('is a core, devnet-only Powerup with one Home sub-tab', () => {
    expect(dagonManifest.id).toBe('dagon');
    expect(dagonManifest.tier).toBe('core');
    expect(dagonManifest.networks).toEqual(['solana-devnet']);
    expect(dagonManifest.entries).toEqual({ tab: 'dagon' });
    expect(dagonManifest.permissions).toEqual(['address', 'balances']);
    expect(dagonManifest.iconName).toBe('Stack');
    expect(dagonManifest.freshSigners).toBe(true);
    expect(dagonManifest.locales).toBe('dagon');
    expect(dagonManifest.nameKey).toBe('dagon.catalog.name');
  });

  it('declares exactly the seven programs its transactions may call', () => {
    expect([...dagonManifest.programs].sort()).toEqual(
      [
        '4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8',
        '3kjJEx6G1XdrtixFg9f8eGRAyzW5QmhsJQq6qCUZYhXZ',
        'BqJMtWQYiis1264KqBN3wssNqTofK5RuP67hkZYvb4SD',
        TOKEN_PROGRAM,
        ASSOCIATED_TOKEN_PROGRAM,
        SYSTEM_PROGRAM,
        COMPUTE_BUDGET_PROGRAM,
      ].sort()
    );
  });

  it('is registered, and never offered on mainnet', () => {
    const entry = POWERUPS.find((manifest) => manifest.id === 'dagon');
    expect(entry).toBe(dagonManifest);
    expect(isPowerupOnNetwork(entry!, 'solana-mainnet')).toBe(false);
    expect(isPowerupOnNetwork(entry!, 'solana-devnet')).toBe(true);
  });
});
