# Quickstart: test Seed Vault accounts on the emulator

1. Build the Seed Vault simulator from solana-mobile/seed-vault-sdk (tag v0.4.0):
   `./gradlew :SeedVaultSimulator:assembleDebug` with `JAVA_HOME` set to Android Studio's JBR and
   `local.properties` pointing at the Android SDK. Install it on `Seeker_API35`.
2. In the simulator: Add → name `TestSeed`, PIN `1234` → Save. Test seeds only, never a real phrase.
3. In `apps/mobile/.maestro/.env.test`: `SALMON_SEED_VAULT_PIN=1234` and `SALMON_SEED_VAULT_ADDR` = the
   address of the seed's `m/44'/501'/0'` account (the first row "Use Seed Vault" lists).
4. Development build installed, Metro running, backend reachable (`SALMON_API_URL`), then from
   `apps/mobile/.maestro`:
   - `./run.sh flows/actions/seed-vault/add-seed-vault-wallet.yaml` — adds the wallet on devnet.
   - `./run.sh flows/actions/seed-vault/send-from-seed-vault.yaml` — Wallet A funds it, it sends back.
   - With `npx solana-mobile playground --cluster devnet` serving, right after the add flow (a cold
     development build cannot load the dApp sheet's bundle):
     `./run.sh flows/actions/seed-vault/mwa-sign.yaml` — connect, sign message, sign transaction,
     sign and send, sign in, and a refusal in Seed Vault.
5. Revoked access: the simulator has no per-app revoke; its Clear (all seeds) invalidates Salmon's
   authorization the same way, and signing then refuses as revoked (Seed Vault result 1002).

Results observed 2026-10-07 on `Seeker_API35` with the simulator: every step above passed; sign and
send finalized on devnet; the refusal reached the dApp as "declined"; revoked access read as revoked.
