import { describe, expect, it } from 'vitest';

import { isBelowVersion, isUpdateRequired, parseVersion, readMinimumVersion } from './storeRelease';

describe('parseVersion', () => {
  it.each([
    ['1.2.0', [1, 2, 0]],
    ['1.2', [1, 2]],
    ['2', [2]],
    [' 1.10.3 ', [1, 10, 3]],
  ])('reads %s', (value, expected) => {
    expect(parseVersion(value)).toEqual(expected);
  });

  it.each(['', '1.2.0-beta', 'v1.2.0', '1.2.0.4', 'latest', 12, null, undefined, {}])(
    'refuses %s',
    (value) => {
      expect(parseVersion(value)).toBeNull();
    }
  );
});

describe('isBelowVersion', () => {
  it.each([
    [[1, 1, 0], [1, 2, 0], true],
    [[1, 2, 0], [1, 2, 0], false],
    [[1, 2, 1], [1, 2, 0], false],
    [[1, 2], [1, 2, 0], false],
    [[1, 2], [1, 2, 1], true],
    [[1, 9, 9], [1, 10, 0], true],
    [[2, 0, 0], [1, 99, 99], false],
  ])('%s below %s → %s', (installed, minimum, expected) => {
    expect(isBelowVersion(installed, minimum)).toBe(expected);
  });
});

describe('readMinimumVersion', () => {
  const file = { ios: { minimumVersion: '1.2.0' }, android: { minimumVersion: '1.1.0' } };

  it('reads the platform entry', () => {
    expect(readMinimumVersion(file, 'ios')).toEqual([1, 2, 0]);
    expect(readMinimumVersion(file, 'android')).toEqual([1, 1, 0]);
  });

  it.each([
    null,
    undefined,
    'text',
    [],
    {},
    { ios: null },
    { ios: {} },
    { ios: { minimumVersion: 'soon' } },
  ])('reads nothing from %s', (broken) => {
    expect(readMinimumVersion(broken, 'ios')).toBeNull();
  });
});

describe('isUpdateRequired', () => {
  const file = { ios: { minimumVersion: '1.2.0' }, android: { minimumVersion: '1.2.0' } };

  it('requires an update when the installed version is older', () => {
    expect(isUpdateRequired('1.1.0', file, 'ios')).toBe(true);
    expect(isUpdateRequired('1.1.0', file, 'android')).toBe(true);
  });

  it('opens the app on the minimum or newer', () => {
    expect(isUpdateRequired('1.2.0', file, 'ios')).toBe(false);
    expect(isUpdateRequired('1.3.0', file, 'android')).toBe(false);
  });

  // The rule that matters most: every doubt opens the wallet.
  it('opens the app when either version cannot be read', () => {
    expect(isUpdateRequired('', file, 'ios')).toBe(false);
    expect(isUpdateRequired(undefined, file, 'ios')).toBe(false);
    expect(isUpdateRequired('1.1.0', null, 'ios')).toBe(false);
    expect(isUpdateRequired('1.1.0', { ios: { minimumVersion: 'latest' } }, 'ios')).toBe(false);
    expect(isUpdateRequired('1.1.0', { android: { minimumVersion: '9.0.0' } }, 'ios')).toBe(false);
  });
});
