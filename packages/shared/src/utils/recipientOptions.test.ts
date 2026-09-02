import { describe, expect, it } from 'vitest';
import { MAX_RECENTS, recipientOptions } from './recipientOptions';

const send = (destination: string) =>
  ({ type: 'send', outputs: [{ destination }] }) as unknown as Parameters<
    typeof recipientOptions
  >[0]['transactions'][number];
const receive = () =>
  ({ type: 'receive', outputs: [] }) as unknown as Parameters<
    typeof recipientOptions
  >[0]['transactions'][number];

const ME = 'MeMeMeMeMeMeMeMeMeMeMeMeMeMeMeMeMeMeMeMeMe11';
const ALICE = 'A1iceA1iceA1iceA1iceA1iceA1iceA1iceA1ice1111';
const BOB = 'BobBobBobBobBobBobBobBobBobBobBobBobBobBob11';

describe('recipientOptions', () => {
  it('lists past send counterparties once, newest first, named from the address book', () => {
    const { recents } = recipientOptions({
      transactions: [send(ALICE), receive(), send(BOB), send(ALICE)],
      senderAddress: ME,
      contacts: [{ name: 'Alice', address: ALICE }],
      ownWallets: [],
    });
    expect(recents.map((r) => r.address)).toEqual([ALICE, BOB]);
    expect(recents[0].name).toBe('Alice');
    expect(recents[1].name).not.toBe(BOB); // the short form, not the raw address
    expect(recents[1].name.length).toBeLessThan(BOB.length);
  });

  it('never lists the sender itself and stops at MAX_RECENTS', () => {
    const many = Array.from({ length: MAX_RECENTS + 3 }, (_, i) =>
      send(`${BOB.slice(0, -2)}${i}x`)
    );
    const { recents } = recipientOptions({
      transactions: [send(ME), ...many],
      senderAddress: ME,
      contacts: [],
      ownWallets: [],
    });
    expect(recents).toHaveLength(MAX_RECENTS);
    expect(recents.some((r) => r.address === ME)).toBe(false);
  });

  it('keys contacts and own wallets by group so the rows never collide', () => {
    const { contactRows, walletRows } = recipientOptions({
      transactions: [],
      senderAddress: ME,
      contacts: [{ name: 'Alice', address: ALICE }],
      ownWallets: [{ accountName: 'Account 2', address: BOB }],
    });
    expect(contactRows).toEqual([{ key: `contact-${ALICE}`, name: 'Alice', address: ALICE }]);
    expect(walletRows).toEqual([{ key: `wallet-${BOB}`, name: 'Account 2', address: BOB }]);
  });
});
