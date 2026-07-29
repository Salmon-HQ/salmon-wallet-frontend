import { describe, it, expect } from 'vitest';
import type { DAppApprovalRequest, DAppSignOffchainMessageRequest } from './dapp-approval';

describe('DAppSignOffchainMessageRequest', () => {
  it('is assignable to the DAppApprovalRequest union and carries data + requiredSigners', () => {
    // Arrange
    const request: DAppSignOffchainMessageRequest = {
      id: 'req-ocms-1',
      method: 'signOffchain',
      params: {
        data: [104, 105],
        requiredSigners: ['9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3'],
      },
    };

    // Act
    const asUnionMember: DAppApprovalRequest = request;

    // Assert
    expect(asUnionMember.method).toBe('signOffchain');
    if (asUnionMember.method === 'signOffchain') {
      expect(asUnionMember.params?.data).toEqual([104, 105]);
      expect(asUnionMember.params?.requiredSigners).toEqual([
        '9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3',
      ]);
    }
  });
});
