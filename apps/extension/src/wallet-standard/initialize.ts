import { registerWallet } from './register.js';
import { SalmonWallet } from './wallet.js';
import type { Salmon } from './window.js';

export function initialize(salmon: Salmon): void {
    registerWallet(new SalmonWallet(salmon));
}
