/**
 * NFT Transfer Service
 *
 * Provides serialized transactions for NFT transfer operations.
 *
 * API Endpoints:
 * - POST /v1/{networkId}/nft/{mintAddress}/transfer?owner={owner}&destination={destination}
 *
 * Why go through the backend at all, when a token transfer is normally a plain
 * SPL instruction the client can build itself: a programmable NFT (pNFT) keeps
 * its token account permanently frozen, so an SPL transfer always fails with
 * `Account is frozen` (custom program error 0x11). Moving a pNFT requires Token
 * Metadata's `transferV1`, which needs the metadata, edition, token-record and
 * authorization-rule accounts. The backend already owns the Metaplex stack (it
 * builds burn transactions the same way), so it builds the transaction and the
 * client only signs it.
 */

import { apiClient } from '../client';
import type { SolanaNetworkId } from '../../types/blockchain';
import type { PreparedNftTransactionResponse as TransactionResponse } from '../../types/nft';

export interface TransferNftParams {
  /** Mint address of the NFT being sent. */
  mintAddress: string;
  /** Current owner's address. Signs and pays the fee. */
  ownerAddress: string;
  /** Recipient wallet address. */
  destinationAddress: string;
}

/**
 * Create an unsigned transaction that transfers an NFT.
 *
 * Handles every Metaplex variant the wallet can hold — classic NFTs,
 * programmable NFTs and compressed NFTs — because the backend dispatches on the
 * asset's token standard.
 *
 * @param params - mint, current owner, recipient
 * @param networkId - Network identifier (default: 'solana-mainnet')
 * @returns Serialized transaction ready for signing
 */
export async function createNftTransferTransaction(
  params: TransferNftParams,
  networkId: SolanaNetworkId = 'solana-mainnet'
): Promise<TransactionResponse> {
  const { mintAddress, ownerAddress, destinationAddress } = params;

  const { data } = await apiClient.post<TransactionResponse>(
    `/v1/${networkId}/nft/${mintAddress}/transfer`,
    undefined,
    {
      params: {
        owner: ownerAddress,
        destination: destinationAddress,
      },
    }
  );

  if (!data?.transaction && !data?.transactions?.length) {
    throw new Error('Transfer transaction was not returned by the API');
  }

  return data;
}
