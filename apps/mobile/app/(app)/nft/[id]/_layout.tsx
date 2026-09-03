/**
 * The NFT flow — five screens, one passage (spec 019, delta D7).
 *
 * The NFT detail used to be a bottom sheet with five steps sliding inside it.
 * Every one of those steps changes what the surface is (a collectible, a
 * recipient, a signature, a burn confirmation, a receipt), which is exactly
 * the case DESIGN.md §Sheets sends to a screen — it names the NFT detail
 * explicitly. So the steps are routes now, and this sub-stack holds them
 * together.
 *
 * The layout owns the `[id]` segment, so the mint is read once here and the
 * provider above the screens keeps the flow's state — recipient, burn preview,
 * receipt — alive across a back gesture and across the global lock overlay
 * covering the stack mid-transaction.
 *
 * `id` is the mint, never `screen`: that param name is reserved by React
 * Navigation (see the header comment on `app/(app)/settings/[panel].tsx`).
 */
import React, { useEffect, useRef } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { useAccountsContext, type SolanaNetworkId } from '@salmon/shared';

import { NftFlowProvider, useNftFlow } from '../../../../src/contexts/NftFlowContext';

/**
 * The passage: whichever step committed, the receipt takes its place.
 *
 * It lives here rather than on the two committing screens because both of them
 * hand the screen over the moment they commit, and `replace` is what keeps the
 * signed transaction from sitting behind a back gesture.
 */
function NftPassage({ mint, query }: { mint: string; query: string }) {
  const router = useRouter();
  const { successTxId } = useNftFlow();
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!successTxId || navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace(`/nft/${encodeURIComponent(mint)}/success${query}`);
  }, [successTxId, mint, query, router]);

  return null;
}

export default function NftLayout() {
  const params = useLocalSearchParams<{ id: string; sub?: string }>();
  const [accountState] = useAccountsContext();

  // The screen follows the network the session stands on (spec 026 D2), so the
  // network is derived here rather than carried in the link: a `section` param
  // from an older link is ignored outright, so a crafted link can never point
  // the flow — and the key that would sign a send or a burn — at a network the
  // session is not standing on.
  const networkId = (accountState.networkId ?? 'solana-mainnet') as SolanaNetworkId;
  const subAccountIndex = Number.parseInt(params.sub ?? '0', 10) || 0;

  return (
    <NftFlowProvider mint={params.id} networkId={networkId} subAccountIndex={subAccountIndex}>
      {/* Headers stay hidden: every screen draws the kit's own `ScreenHeader`.
          The right slide is inherited from the app stack — an NFT screen is a
          pushed screen like any other and must not arrive from a different
          edge (spec 017 FR-006). */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="send" />
        <Stack.Screen name="review" />
        <Stack.Screen name="burn" />
        {/* There is nothing behind a signed transaction. The receipt's only way
            out is "Return home", so the back gesture is taken off it. */}
        <Stack.Screen name="success" options={{ gestureEnabled: false }} />
      </Stack>
      <NftPassage mint={params.id} query={`?sub=${subAccountIndex}`} />
    </NftFlowProvider>
  );
}
