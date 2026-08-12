# WalletHeader contract

The header has three independent press targets. Treat them as the contract;
do not collapse them into a single tap zone.

| Target                 | Action                               | Prop              |
| ---------------------- | ------------------------------------ | ----------------- |
| Avatar / wallet icon   | Opens the wallet switcher sheet      | `onWalletPress`   |
| Account name + address | Copies the full address to clipboard | `onCopyAddress`   |
| Settings (gear) icon   | Opens the settings panel/route       | `onSettingsPress` |

The avatar specifically — not the surrounding name/address row — is the
wallet switcher entrypoint. The account name area is intentionally a copy
target, mirroring the mobile contract.

When wiring this component on a new surface:

- pass all three callbacks; do not omit `onWalletPress`
- do not bind the entire `Container` to settings or any other action
- keep the right-side gear icon dedicated to settings
