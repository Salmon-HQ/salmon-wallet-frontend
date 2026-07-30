import { address, getAddressEncoder } from '@solana/kit';
import type { Address } from '@solana/kit';

/**
 * Public contract of `window.salmon.publicKey`.
 *
 * A `Uint8Array` subclass carrying the `PublicKey` members dApps actually read,
 * so the legacy patterns keep working without shipping `@solana/web3.js` into
 * every page: being a byte array is what makes `new PublicKey(wallet.publicKey)`
 * resolve, and it is the most common legacy call.
 *
 * There is deliberately no `_bn` field and no bn.js. Two web3.js patterns reach
 * into that private field and therefore cannot work: `realKey.equals(salmon)`
 * (the real key on the left) and compiling a *legacy* `Transaction` with this
 * key as fee payer (legacy sorts account keys through `PublicKey.equals`, while
 * v0 sorts through a base58 map and works). Both are pinned as failing
 * assertions in `SalmonAddress.test.ts`.
 */
export interface SalmonAddress extends Uint8Array {
  toBase58(): string;
  toString(): string;
  toBytes(): Uint8Array;
  toBuffer(): Uint8Array;
  equals(other: unknown): boolean;
  toJSON(): string;
}

class SalmonAddressImpl extends Uint8Array {
  readonly #base58: Address;

  constructor(base58: Address) {
    super(getAddressEncoder().encode(base58));
    this.#base58 = base58;
  }

  /** Derived operations (`slice`, `map`, …) yield plain byte arrays. */
  static get [Symbol.species](): Uint8ArrayConstructor {
    return Uint8Array;
  }

  toBase58(): string {
    return this.#base58;
  }

  toString(): string {
    return this.#base58;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this);
  }

  /** `Uint8Array`, not `Buffer` — the injected bundle has no Buffer polyfill. */
  toBuffer(): Uint8Array {
    return new Uint8Array(this);
  }

  toJSON(): string {
    return this.#base58;
  }

  equals(other: unknown): boolean {
    const otherBase58 =
      typeof (other as { toBase58?: () => string })?.toBase58 === 'function'
        ? (other as { toBase58(): string }).toBase58()
        : String(other);
    return otherBase58 === this.#base58;
  }
}

/**
 * Builds the injected public-key object from a base58 address. `address()`
 * validates exactly where `new PublicKey()` used to, so a malformed payload
 * from the content script is still rejected at this edge.
 */
export function toSalmonAddress(value: string): SalmonAddress {
  return new SalmonAddressImpl(address(value));
}
