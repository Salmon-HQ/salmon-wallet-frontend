import { describe, expect, it } from 'vitest';
import bs58 from 'bs58';

import {
  generateWrapKey,
  isSealedPassword,
  openSealedPassword,
  sealPassword,
  SealOpenError,
} from './biometric-seal';

describe('biometric seal', () => {
  it('returns the same password it sealed', () => {
    const wrapKey = generateWrapKey();

    const record = sealPassword('correct horse battery staple', wrapKey);

    expect(openSealedPassword(record, wrapKey)).toBe('correct horse battery staple');
  });

  it('survives a password that is not plain ASCII', () => {
    const wrapKey = generateWrapKey();

    const record = sealPassword('contraseña—ñandú🐟', wrapKey);

    expect(openSealedPassword(record, wrapKey)).toBe('contraseña—ñandú🐟');
  });

  it('refuses a different wrapping key', () => {
    const record = sealPassword('hunter2', generateWrapKey());

    expect(() => openSealedPassword(record, generateWrapKey())).toThrow(SealOpenError);
  });

  it('refuses a tampered seal rather than returning garbage', () => {
    const wrapKey = generateWrapKey();
    const record = sealPassword('hunter2', wrapKey);
    const bytes = bs58.decode(record.sealed);
    bytes[0] = bytes[0] ^ 0xff;

    expect(() => openSealedPassword({ ...record, sealed: bs58.encode(bytes) }, wrapKey)).toThrow(
      SealOpenError
    );
  });

  it('refuses a wrapping key of the wrong length', () => {
    const record = sealPassword('hunter2', generateWrapKey());

    expect(() => openSealedPassword(record, bs58.encode(new Uint8Array(16)))).toThrow(SealOpenError);
  });

  it('refuses a wrapping key that is not base58', () => {
    const record = sealPassword('hunter2', generateWrapKey());

    expect(() => openSealedPassword(record, 'not base58 !!!')).toThrow(SealOpenError);
  });

  it('uses a fresh nonce per seal, so the same password never repeats a ciphertext', () => {
    const wrapKey = generateWrapKey();

    const first = sealPassword('hunter2', wrapKey);
    const second = sealPassword('hunter2', wrapKey);

    expect(first.nonce).not.toBe(second.nonce);
    expect(first.sealed).not.toBe(second.sealed);
  });

  it('mints a distinct 32-byte wrapping key each time', () => {
    const first = generateWrapKey();
    const second = generateWrapKey();

    expect(bs58.decode(first)).toHaveLength(32);
    expect(first).not.toBe(second);
  });

  it('recognizes a sealed record and rejects anything else', () => {
    expect(isSealedPassword(sealPassword('hunter2', generateWrapKey()))).toBe(true);
    expect(isSealedPassword({ nonce: 'a' })).toBe(false);
    expect(isSealedPassword(null)).toBe(false);
    expect(isSealedPassword('sealed')).toBe(false);
  });
});
