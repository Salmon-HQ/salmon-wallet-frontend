# Quickstart: A dApp connection that does not dead-end (spec 041)

Run it as in [036's quickstart](../036-mwa-wallet/quickstart.md) (`Seeker_API35`, `npx solana-mobile@latest playground`), and finish on a **release** build, the kind the dApp Store reviews.

## Hand-test

1. **Devnet dApp, wallet on mainnet**: `playground --cluster devnet` → Connect → Salmon offers "Switch to Devnet" → switch → connect approval → approve → the page shows the address; Salmon's network is Devnet.
2. **Cancel the switch**: same, tap Cancel → the page reports declined; Salmon stays on Mainnet.
3. **Mainnet dApp, wallet on devnet**: the same offer, the other way.
4. **No wallet**: clear the app's data → Connect → "No wallet yet" → Open Salmon → Salmon opens on create-or-import; the page reports declined.
5. **Unsupported network**: `playground --cluster testnet` → Connect → Salmon names testnet as unsupported, Close only.
6. **Regression**: Sign Message, Sign Transaction and Sign and Send on mainnet and devnet still complete.
