import type { NetworkId } from '../types/blockchain';

export const queryKeys = {
  balance: (params: { accountId: string; networkId: NetworkId; includeSpam?: boolean }) =>
    ['balance', params] as const,
  avatarNfts: (params: { accountId: string }) => ['avatar-nfts', params] as const,
  solanaNfts: (params: { accountId: string; networkId: NetworkId; includeSpam?: boolean }) =>
    ['solana-nfts', params] as const,
  transactions: (params: { accountId: string; networkId: NetworkId }) =>
    ['transactions', params] as const,
  coinInfo: (params: { coinId: string; currency: string }) => ['coin-info', params] as const,
  marketChart: (params: { coinId: string; currency: string; days: number }) =>
    ['market-chart', params] as const,
  jupiterTokenList: (params: { networkId: NetworkId }) => ['jupiter-token-list', params] as const,
  dappMetadata: (params: { origin: string }) => ['dapp-metadata', params] as const,
  token: (params: { tokenId: string; networkId: NetworkId }) => ['token', params] as const,
  solanaNftDetail: (params: { mintAddress: string; networkId: NetworkId }) =>
    ['solana-nft-detail', params] as const,
} as const;
