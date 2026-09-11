import { describe, expect, it, vi } from 'vitest';
import { ACCOUNT_EDIT_SECTIONS, buildAccountEditActions } from './accountEdit';

describe('buildAccountEditActions', () => {
  it('maps each ACCOUNT_EDIT_SECTIONS action to its matching handler', () => {
    const onEditName = vi.fn();
    const onEditAvatar = vi.fn();
    const onBackupSeed = vi.fn();
    const onExportPrivateKey = vi.fn();

    const actions = buildAccountEditActions({
      onEditName,
      onEditAvatar,
      onBackupSeed,
      onExportPrivateKey,
    });

    // Every section listed has a wired handler.
    for (const section of ACCOUNT_EDIT_SECTIONS) {
      expect(actions[section.action]).toBeTypeOf('function');
    }

    actions.name();
    actions.avatar();
    actions.backup();
    actions.privateKey();

    expect(onEditName).toHaveBeenCalledTimes(1);
    expect(onEditAvatar).toHaveBeenCalledTimes(1);
    expect(onBackupSeed).toHaveBeenCalledTimes(1);
    expect(onExportPrivateKey).toHaveBeenCalledTimes(1);
  });
});
