# Quickstart: test Seed Vault accounts on the emulator

1. Build and install the Seed Vault simulator from solana-mobile/seed-vault-sdk (`SeedVaultSimulator`) on `Seeker_API35`; create a seed from a test phrase. Never a real phrase.
2. Install the Salmon development build and start Metro.
3. Settings → Add wallet → Use Seed Vault → allow the permission → authorize the test seed → pick account 0.
4. Switch to devnet, fund it from a faucet, send SOL: Salmon's review, then the simulator's confirmation; the signature resolves on a devnet explorer.
5. Run the Mobile Wallet Adapter playground with the Seed Vault wallet active: connect, sign message, sign transaction, sign and send, sign in.
6. Cancel a confirmation: nothing is signed. Revoke Salmon in the simulator: signing refuses with the revoked-access message.
