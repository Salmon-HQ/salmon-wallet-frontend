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

import {
  NftFlowProvider,
  useNftFlow,
  type NftSectionKey,
} from '../../../../src/contexts/NftFlowContext';
import { useDeveloperMode } from '../../../../src/contexts/DeveloperModeContext';

/** The section a mint that arrives without one is looked up in. */
const DEFAULT_SECTION: NftSectionKey = 'solana';

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
  const params = useLocalSearchParams<{ id: string; section?: string; sub?: string }>();
  const developerNetworks = useDeveloperMode();

  // Devnet only exists for a wallet that has opted into Developer Networks. A
  // deep link naming it while the flag is off falls back to mainnet, the same
  // as an unknown section — fail closed, so a crafted link cannot point the
  // flow at a network the user never enabled.
  const sectionKey: NftSectionKey =
    params.section === 'solana-devnet' && developerNetworks ? 'solana-devnet' : DEFAULT_SECTION;
  const subAccountIndex = Number.parseInt(params.sub ?? '0', 10) || 0;

  return (
    <NftFlowProvider mint={params.id} sectionKey={sectionKey} subAccountIndex={subAccountIndex}>
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
      <NftPassage mint={params.id} query={`?section=${sectionKey}&sub=${subAccountIndex}`} />
    </NftFlowProvider>
  );
}
