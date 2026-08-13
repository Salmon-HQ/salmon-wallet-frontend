# App Store submission runbook — iOS v1.0.3

How to move the app from TestFlight to App Store review in App Store Connect
(ASC). The build (13 / v1.0.3) is already uploaded; everything below is
metadata + forms. No rebuild needed.

> Icon is embedded in the build (`ios-icon.png`, 1024×1024, opaque). There is
> **no manual icon upload** in ASC — it is extracted from the build.

---

## 0. Fix the version number first

The version record was created as **1.0** but the build's short version is
**1.0.3**. A build only attaches to a version record whose string matches its
`CFBundleShortVersionString`. On the "iOS App Version 1.0" page, set the
**Version** field to `1.0.3` and Save before trying to add the build. (The
page title will follow.)

---

## 1. Screenshots (REQUIRED — blocks submission)

At minimum one set of **6.9"** (iPhone 16 Pro Max, 1320×2868) screenshots. A
6.5" set is also commonly required. Capture from the iOS Simulator (16 Pro
Max) or a device. 3–5 shots: lock/onboarding, home/balances, receive, send,
token detail. Upload in the "App Previews and Screenshots" block at the top of
the version page.

---

## 2. Version page — copy to paste

**Promotional Text** (170 max, editable without review):

```
Self-custodial Solana & Bitcoin wallet. Your keys, your coins. Send, receive, swap, and track tokens — open source and non-custodial.
```

**Description** (4000 max):

```
Salmon is an open-source, self-custodial crypto wallet for Solana and Bitcoin. You hold your own keys — Salmon never has access to your funds or your seed phrase.

FEATURES
• Self-custodial by design: your seed phrase is generated and stored only on your device.
• Solana and Bitcoin support in one wallet.
• Send and receive crypto with a simple, fast interface.
• Swap tokens directly in the wallet.
• Track balances, token prices, and market info.
• View your SPL tokens, including charts and token details.
• Import an existing wallet with your recovery phrase, or create a new one in seconds.

PRIVACY
• No account, no email, no KYC to get started.
• Optional, anonymous usage analytics — off by default, you choose.
• Open source: review the code yourself.

Salmon is non-custodial software. You are responsible for safeguarding your recovery phrase. If you lose it, no one — including us — can recover your funds.
```

**Keywords** (100 max, comma-separated, no spaces):

```
crypto,wallet,solana,bitcoin,web3,self-custody,swap,SPL,defi,blockchain,seed,token
```

**Support URL** (required): `https://salmonwallet.io/faq`
**Marketing URL** (optional): `https://salmonwallet.io`
**Version**: `1.0.3`
**Copyright**: `2026 Salmon` (or the legal entity name)
**Routing App Coverage File**: leave empty.

---

## 3. Build section

Click **Add Build** → select build **13 (1.0.3)**. Must be fully processed
(not "Processing"). If it does not appear, the version-string mismatch in
step 0 is the cause.

Leave **App Clip**, **iMessage App**, **Game Center**, **In-App Purchases**
untouched (none apply).

---

## 4. App Review Information (screenshot 3)

**Sign-In Information**: **UNCHECK "Sign-in required".** Salmon has no server
account — the app lock is a local password the reviewer sets themselves. A
checked box with no real credentials gets the app rejected as "couldn't sign
in."

**Contact Information**: your real first/last name, phone, email — this is
Apple contacting the submitter, not public.

**Notes** (paste the review notes from section 6 below).

**Attachment**: optional, skip.

**App Store Version Release**: choose **Manually release this version** — a
live-funds wallet should not auto-publish the instant it's approved; you want
to control the go-live moment.

---

## 5. Left-sidebar sections that must be green before "Add for Review"

### App Information (General)

- **Privacy Policy URL** (required): needs a reachable privacy policy. If
  `https://salmonwallet.io/privacy` exists, use it. If not, publish one first —
  ASC will not let you submit without it.
- **Category**: Primary = **Finance**. Secondary = Utilities (optional).
- **Content Rights**: declare whether it contains third-party content — for
  this app, "No, it does not contain, show, or access third-party content."

### App Privacy (Trust & Safety) — declare honestly

Analytics is opt-in and anonymous. Declare:

- **Usage Data → Product Interaction**: **Collected**.
  - Linked to the user? **No** (install id is a random UUID, not tied to
    identity, seed, or address).
  - Used for tracking? **No.**
- Everything else (Contacts, Financial Info, Location, Identifiers/IDFA,
  etc.): **Not Collected**. The wallet does not send addresses, balances, or
  seed material off-device; swap/price calls are functional, not analytics.

If asked "Do you collect data?": **Yes** (because of optional analytics), then
only the Product Interaction toggle above.

### Age Rating (App Information → Age Rating)

Answer the questionnaire honestly. Crypto wallet with no gambling/violence
→ typically **17+** because of "Unrestricted Web Access" / financial nature;
follow Apple's questions, don't force a number.

### Pricing and Availability

Price = **Free**. Availability = all territories (or restrict if you have
legal reasons to exclude any).

---

## 6. Review Notes (paste into "Notes")

> ⚠️ Fill the `<...>` demo-seed line yourself. NEVER paste a mainnet seed that
> holds real funds. See section 7.

```
Salmon is an open-source, self-custodial (non-custodial) wallet for Solana and Bitcoin. There is NO server account or login — the app is unlocked with a local password that the user sets on this device, so no username/password is provided to Apple.

HOW TO REVIEW
1. Launch the app. On first run you can either create a new wallet or import an existing recovery phrase.
2. To create: tap "Create wallet", set a local password, and save the generated recovery phrase. You now have a working wallet and can view your receive address, settings, token list, and swap UI.
3. To review with a pre-funded wallet, import this recovery phrase (test wallet, holds only a small amount for review):
   Recovery phrase: <PASTE A THROWAWAY 12/24-WORD PHRASE HERE — NOT A REAL-FUNDS WALLET>
   Local password to set on import: <any password you choose>

NOTES FOR REVIEW
- The wallet is non-custodial: the recovery phrase is generated and stored only on the device. Salmon's servers never receive it.
- Usage analytics are OFF by default and fully optional (opt-in prompt on first run). No personal data, addresses, or balances are sent.
- On-chain actions (send/swap) require a funded wallet and broadcast real transactions on Solana/Bitcoin mainnet.
- Source code: https://github.com/salmonw (open source).

Contact for any questions: support@salmonwallet.io
```

---

## 7. Demo seed — safety

Apple reviewers need to see core flows. Two safe options:

- **Preferred**: create a fresh wallet, fund it with **a tiny amount** (a
  couple dollars of SOL + a token) purely for review, and paste THAT recovery
  phrase in the notes. Treat it as burned/public afterward — never reuse it.
- **Minimal**: skip the funded seed. Core UX (create/import, receive address,
  settings, token list, swap UI) is demonstrable on an empty wallet. Risk:
  reviewer may want to see a populated balance; the funded option is safer
  against a "couldn't evaluate functionality" rejection.

NEVER put a mainnet seed with meaningful funds in review notes — ASC notes are
readable by anyone with account access and are not a secret store.

---

## 8. Export Compliance (asked at submit time)

The app uses encryption (wallet crypto + HTTPS). At submit you'll be asked
about encryption:

- It uses standard crypto (key derivation, signing) — most wallets qualify for
  the exemption for apps that only use encryption for authentication / standard
  algorithms and don't implement proprietary crypto.
- To stop being asked every build, you can set
  `ITSAppUsesNonExemptEncryption=false` in the iOS Info.plist (via the Expo
  config) **only if** legal confirms you qualify for the exemption.
- ⚠️ A wallet that signs transactions may need a **self-classification report /
  CCATS** with the U.S. BIS depending on interpretation. Confirm with legal
  before declaring — this is the one item that can stall a wallet.

---

## 9. Submit

Version page → **Add for Review** → **Submit for Review**. State goes to
"Waiting for Review". With Manual release selected, after approval you press
"Release This Version" when ready.

## Checklist

- [ ] Version field = 1.0.3, Saved
- [ ] Screenshots (6.9" at least) uploaded
- [ ] Description / keywords / promo text / support URL filled
- [ ] Build 13 attached
- [ ] Sign-in required UNCHECKED
- [ ] Review notes pasted (+ demo seed decision made)
- [ ] Contact info filled
- [ ] Manual release selected
- [ ] App Information: Privacy Policy URL + category + content rights
- [ ] App Privacy: Product Interaction (not linked, not tracking), rest not collected
- [ ] Age rating questionnaire done
- [ ] Pricing = Free
- [ ] Export compliance answered (legal-confirmed)
- [ ] Add for Review → Submit
