/**
 * GOLDEN VECTORS — Bitcoin transaction signing acceptance gate.
 *
 * These constants pin the exact bytes produced by createTransferTransaction
 * (bitcoinjs-lib Psbt + bip32/@bitcoinerlab/secp256k1 signing) for a fixed
 * keypair, fixed UTXOs, and a fixed recipient/amount. Any refactor of UTXO
 * selection, output ordering, fee estimation, or signing that changes these
 * bytes must fail here — signing is the last gate before funds move.
 *
 * Determinism: @bitcoinerlab/secp256k1 produces RFC6979 deterministic ECDSA
 * signatures, inputs are added in UTXO order, and the flow contains no
 * timestamps or randomness, so the serialized transaction is byte-stable.
 *
 * Generated once (2026-08-12) by running this file with empty golden
 * constants and pasting the reported `actual` values — the fixtures below are
 * the output of the real implementation at that commit. To regenerate (only
 * ever when the transaction format is intentionally changed — NEVER to make a
 * refactor diff go green): blank the constants, run the suite, paste the
 * reported values.
 *
 * Keys derive from the public BIP39 test vector mnemonic ("abandon ... about")
 * and hold no funds. Never use them outside tests.
 */
import { describe, expect, it, vi } from 'vitest';
import * as bitcoin from 'bitcoinjs-lib';
import { deriveBitcoinKeypair } from '../../crypto/mnemonic';
import { createKeyPairFromNode, BITCOIN_NETWORKS } from './factory';
import { createTransferTransaction, sendBitcoin } from './transfer';
import type { SigningKeyPair, UTXO } from '../../types/transfer';

// ============================================================================
// Fixtures
// ============================================================================

/** Public BIP39 test vector — never holds funds. */
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

/** Publicly known P2PKH address used as the recipient (no funds involved). */
const RECEIVER_ADDRESS = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

const NETWORK = BITCOIN_NETWORKS['bitcoin-mainnet'];

/**
 * Builds a deterministic "previous transaction" paying `valueSats` to
 * `payTo` at output 0. The Psbt requires the full raw previous transaction
 * (nonWitnessUtxo) for P2PKH inputs and verifies its hash against the input
 * txid, so the fixture must be a structurally valid transaction — its own
 * input is a dummy outpoint (32 bytes of `seedByte`).
 */
function fundingUtxo(valueSats: number, seedByte: number, payTo: string): UTXO {
  const tx = new bitcoin.Transaction();
  tx.version = 2;
  tx.addInput(Buffer.alloc(32, seedByte), 0);
  tx.addOutput(
    bitcoin.address.toOutputScript(payTo, bitcoin.networks.bitcoin),
    BigInt(valueSats)
  );
  return { txid: tx.getId(), vout: 0, satoshis: valueSats, rawTx: tx.toHex() };
}

async function testSigningKeyPair(): Promise<SigningKeyPair> {
  const { node } = await deriveBitcoinKeypair(TEST_MNEMONIC, 0);
  const keyPair = createKeyPairFromNode(node, bitcoin.networks.bitcoin);
  return { ...keyPair, node };
}

/** Two UTXOs: 60_000 + 50_000 sats funding the test address. */
async function fundedUtxos(): Promise<UTXO[]> {
  const { address } = await testSigningKeyPair();
  return [fundingUtxo(60_000, 0x01, address), fundingUtxo(50_000, 0x02, address)];
}

/** 0.0008 BTC = 80_000 sats; fee at 2 inputs / 2 outputs = 736 sats; change = 29_264. */
const AMOUNT_BTC = 0.0008;
const EXPECTED_FEE = 736;
const EXPECTED_CHANGE = 60_000 + 50_000 - 80_000 - EXPECTED_FEE;

// ============================================================================
// Golden constants (generated — see file header)
// ============================================================================

const GOLDEN_TX_ID =
  'a501e53679e6bc8965b6fca1e160435203c009b0a770cf88ee791eeb42d377f6';

const GOLDEN_SIGNED_TX_HEX =
  '02000000023a1f3b788f2ce2649b1ce88f48ad08ba34dfe2bd22bc16abb4f3e02a45da4984000000006b483045022100edf12d7fcbb0c0536d456c735b19a852059ae28f7aa4290d177358cf93b4885d022036a853483b73f03cdeb99a24581cefebf24d246c53ab05cfe8d1e19164604035012103aaeb52dd7494c361049de67cc680e83ebcbbbdbeb13637d92cd845f70308af5effffffff790a7e337821e1a8c849d0c6ef8916bf277a71242b809b959811b67767d0356e000000006a47304402203bc96d77c4dc6c6a127ed7e69beb994c2407ccdcb54e4279849f0578ad28fdc9022042a5fd289928a984f25ec6195bcd3c509520fb2b30acfd896425a32736f7bc8a012103aaeb52dd7494c361049de67cc680e83ebcbbbdbeb13637d92cd845f70308af5effffffff0280380100000000001976a91477bff20c60e522dfaa3350c39b030a5d004e839a88ac50720000000000001976a914d986ed01b7a22225a70edbf2ba7cfb63a15cb3aa88ac00000000';

// ============================================================================
// Tests
// ============================================================================

describe('createTransferTransaction golden vectors', () => {
  it('pins the bytes of a signed P2PKH transfer with a change output', async () => {
    const keyPair = await testSigningKeyPair();
    const utxos = await fundedUtxos();
    const fetchUtxos = vi.fn().mockResolvedValue(utxos);

    const result = await createTransferTransaction(
      NETWORK,
      keyPair,
      RECEIVER_ADDRESS,
      AMOUNT_BTC,
      fetchUtxos
    );

    expect(fetchUtxos).toHaveBeenCalledWith(NETWORK.id, keyPair.address);
    expect(result.serializedTx).toBe(GOLDEN_SIGNED_TX_HEX);
    expect(result.txId).toBe(GOLDEN_TX_ID);

    // Structural cross-check: decode the pinned bytes independently.
    const decoded = bitcoin.Transaction.fromHex(result.serializedTx);
    expect(decoded.ins).toHaveLength(2);
    expect(decoded.outs).toHaveLength(2);
    expect(decoded.outs[0].value).toBe(BigInt(80_000));
    expect(
      bitcoin.address.fromOutputScript(decoded.outs[0].script, bitcoin.networks.bitcoin)
    ).toBe(RECEIVER_ADDRESS);
    // Change goes back to the sender.
    expect(decoded.outs[1].value).toBe(BigInt(EXPECTED_CHANGE));
    expect(
      bitcoin.address.fromOutputScript(decoded.outs[1].script, bitcoin.networks.bitcoin)
    ).toBe(keyPair.address);
  });

  it('omits the change output when the spend consumes the full balance (no dust threshold exists)', async () => {
    // The implementation adds a change output only when change > 0; there is
    // no dust floor — this pins that exact behavior.
    const keyPair = await testSigningKeyPair();
    const utxo = fundingUtxo(50_000, 0x03, keyPair.address);
    const fee = (146 + 2 * 34 + 10 - 1) * 2; // estimateBitcoinFee(1, 2) = 446
    const amountBtc = (50_000 - fee) / 1e8; // change is exactly 0

    const result = await createTransferTransaction(
      NETWORK,
      keyPair,
      RECEIVER_ADDRESS,
      amountBtc,
      vi.fn().mockResolvedValue([utxo])
    );

    const decoded = bitcoin.Transaction.fromHex(result.serializedTx);
    expect(decoded.outs).toHaveLength(1);
    expect(decoded.outs[0].value).toBe(BigInt(50_000 - fee));
  });

  it('fails closed when the UTXOs cannot cover amount + fee', async () => {
    const keyPair = await testSigningKeyPair();
    const utxo = fundingUtxo(50_000, 0x04, keyPair.address);
    const broadcast = vi.fn();

    await expect(
      createTransferTransaction(
        NETWORK,
        keyPair,
        RECEIVER_ADDRESS,
        AMOUNT_BTC, // 80_000 sats > 50_000 available
        vi.fn().mockResolvedValue([utxo])
      )
    ).rejects.toThrow('Balance is too low for this transaction');

    // And via the one-step flow: nothing is ever broadcast.
    await expect(
      sendBitcoin(
        NETWORK,
        keyPair,
        RECEIVER_ADDRESS,
        AMOUNT_BTC,
        vi.fn().mockResolvedValue([utxo]),
        broadcast
      )
    ).rejects.toThrow('Balance is too low for this transaction');
    expect(broadcast).not.toHaveBeenCalled();
  });
});

describe('sendBitcoin broadcast seam', () => {
  it('posts exactly the golden signed hex to the injected broadcast function', async () => {
    const keyPair = await testSigningKeyPair();
    const utxos = await fundedUtxos();
    const broadcast = vi.fn().mockResolvedValue({ txId: 'api-tx-id', success: true });

    const result = await sendBitcoin(
      NETWORK,
      keyPair,
      RECEIVER_ADDRESS,
      AMOUNT_BTC,
      vi.fn().mockResolvedValue(utxos),
      broadcast
    );

    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(broadcast).toHaveBeenCalledWith(
      NETWORK.id,
      keyPair.address,
      GOLDEN_SIGNED_TX_HEX
    );
    expect(result).toEqual({ txId: 'api-tx-id', success: true });
  });
});
