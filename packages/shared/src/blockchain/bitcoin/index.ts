// Bitcoin Account
export { BitcoinAccount } from './BitcoinAccount';
// Note: SATOSHIS_PER_BTC is now canonical in utils/decimals
export type {
  BitcoinAccountOptions,
  BitcoinAccountBalance,
  BitcoinKeyPair,
  BitcoinWalletBalance,
} from './BitcoinAccount';
// Note: BitcoinBalanceItem, TransactionPaging, AccountTransaction,
// AccountTransactionListResponse, FetchBitcoin*Fn, BitcoinAccountApiFunctions
// are canonical in types/transfer — import from there directly

// Factory functions and utilities
export {
  createBitcoinAccount,
  createBitcoinAccountFromKeyPair,
  createBitcoinAccountFromWIF,
  deriveBitcoinAccounts,
  createKeyPairFromNode,
  mapNetworkIdToLibNetwork,
  mapEnvironmentToNetwork,
  getBitcoinDerivationPath,
  BITCOIN_COIN_TYPE,
  BITCOIN_TESTNET_COIN_TYPE,
  BITCOIN_NETWORKS,
} from './factory';
export type { CreateBitcoinAccountOptions, DeriveBitcoinAccountsOptions } from './factory';

// Transfer functions
export {
  createTransferTransaction,
  confirmTransferTransaction,
  sendBitcoin,
  estimateBitcoinFee,
  getUtxos,
  getMaxSendableAmount,
  DEFAULT_FEE_RATE,
} from './transfer';
// Note: btcToSatoshis, satoshisToBtc are now canonical in utils/decimals
// Transfer types are defined in types/transfer.ts — import from there directly
