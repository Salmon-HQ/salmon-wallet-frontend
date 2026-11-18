import { describe, expect, it, vi } from 'vitest';
import { accountAddMethods } from './accountAddPanelCopy';

const icons = {
  derive: 'tree',
  import: 'file',
  'private-key': 'key',
  'watch-only': 'eye',
  'seed-vault': 'vault',
};

function flowWith(overrides: { canDerive?: boolean; canUseSeedVault?: boolean } = {}) {
  return {
    canDerive: true,
    canUseSeedVault: true,
    selectDerive: vi.fn(async () => {}),
    selectImport: vi.fn(),
    selectImportPrivateKey: vi.fn(),
    selectImportWatchOnly: vi.fn(),
    selectSeedVault: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('accountAddMethods', () => {
  it('offers every method, each with its icon, when the account can derive and the device has a Seed Vault', () => {
    const methods = accountAddMethods(flowWith(), icons);

    expect(methods.map((method) => [method.id, method.icon])).toEqual([
      ['derive', 'tree'],
      ['import', 'file'],
      ['private-key', 'key'],
      ['watch-only', 'eye'],
      ['seed-vault', 'vault'],
    ]);
  });

  it('leaves out deriving without a phrase and Seed Vault without the hardware', () => {
    const methods = accountAddMethods(
      flowWith({ canDerive: false, canUseSeedVault: false }),
      icons
    );

    expect(methods.map((method) => method.id)).toEqual(['import', 'private-key', 'watch-only']);
  });

  it('opens the step that belongs to the pressed method, and only that one', () => {
    const flow = flowWith();
    const press = (id: string) =>
      accountAddMethods(flow, icons)
        .find((method) => method.id === id)
        ?.onPress();

    press('private-key');
    expect(flow.selectImportPrivateKey).toHaveBeenCalledTimes(1);
    press('seed-vault');
    expect(flow.selectSeedVault).toHaveBeenCalledTimes(1);
    press('derive');
    expect(flow.selectDerive).toHaveBeenCalledTimes(1);
    expect(flow.selectImport).not.toHaveBeenCalled();
    expect(flow.selectImportWatchOnly).not.toHaveBeenCalled();
  });
});
