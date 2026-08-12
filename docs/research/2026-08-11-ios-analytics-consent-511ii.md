# Does App Review Guideline 5.1.1(ii) permit default-on anonymous analytics?

Research date: 2026-08-11. All sources accessed 2026-08-11.
Scope: Salmon Wallet iOS app; first-party anonymous analytics (random per-install id, no PII, events proxied through own backend to GA4 Measurement Protocol; no Google SDK on device).

## TL;DR verdict

**The hypothesis is CONFIRMED.** Guideline 5.1.1(ii) requires consent for the *collection* of usage data "even if such data is considered to be anonymous", plus an "easily accessible and understandable way to withdraw consent". Anonymity does not exempt collection from the consent requirement — Apple wrote that exemption out explicitly. Burying disclosure in T&C accepted at onboarding is nowhere blessed by Apple text; the only textual route to collection-without-consent is the GDPR "legitimate interest" sentence inside 5.1.1(ii) itself, which shifts the burden to full GDPR/ePrivacy compliance — and EU ePrivacy law itself generally requires consent for non-essential analytics, so the carve-out is a trap, not a loophole. The status-quo dedicated opt-in prompt + Settings toggle is the only variant that clearly complies. Default-on is a gray zone in *enforcement* (widely done, inconsistently policed) but not in *text*.

## 1. Verbatim guideline text

Source: <https://developer.apple.com/app-store/review/guidelines/> (accessed 2026-08-11).

**5.1.1(ii) — Permission** [QUOTED]:

> "**Permission:** Apps that collect user or usage data must secure user consent for the collection, even if such data is considered to be anonymous at the time of or immediately following collection. Paid functionality must not be dependent on or require a user to grant access to this data. Apps must also provide the customer with an easily accessible and understandable way to withdraw consent. Ensure your purpose strings clearly and completely describe your use of the data. Apps that collect data for a legitimate interest without consent by relying on the terms of the European Union's General Data Protection Regulation ("GDPR") or similar statute must comply with all terms of that law."

**5.1.1(i) — Privacy Policies** (relevant excerpt) [QUOTED]:

> "All apps must include a link to their privacy policy … The privacy policy must clearly and explicitly: Identify what data, if any, the app/service collects, how it collects that data, and all uses of that data. … Explain its data retention/deletion policies and describe how a user can revoke consent and/or request deletion of the user's data."

**5.1.2(i) — Data Use and Sharing** (relevant excerpt) [QUOTED]:

> "Unless otherwise permitted by law, you may not use, transmit, or share someone's personal data without first obtaining their permission. … You must receive explicit permission from users via the App Tracking Transparency APIs to track their activity."

## 2. Does ATT apply to Salmon's analytics?

Source: <https://developer.apple.com/app-store/user-privacy-and-data-use/> (accessed 2026-08-11).

Apple's definition of tracking [QUOTED]:

> "Tracking refers to the act of linking user or device data collected from your app with user or device data collected from other companies' apps, websites, or offline properties for targeted advertising or advertising measurement purposes. Tracking also refers to sharing user or device data with data brokers."

First-party analytics note [QUOTED]:

> "The ID for Vendors (IDFV), may be used for analytics across apps from the same content provider. In this case, the use of the AppTrackingTransparency framework is not required."

[INFERENCE] Salmon's design (random per-install id, first-party proxy, no ad targeting, no cross-company linking, no data broker) is **collection, not tracking**. ATT is not required. But ATT and 5.1.1(ii) are independent gates: escaping ATT does not escape the 5.1.1(ii) consent-for-collection requirement, which applies to plain collection and explicitly ignores anonymity.

[CAUTION — documented counterexample] Apple has treated Firebase Analytics as tracking even after the developer disabled IDFA/IDFV and added a custom consent page (rejection under 5.1.2 quoted in <https://developer.apple.com/forums/thread/688582>, accessed 2026-08-11: "you do not use App Tracking Transparency to request the user's permission before collecting data used to track"). Salmon's no-SDK, server-side Measurement Protocol design avoids the on-device Google SDK that triggered this, which materially lowers that risk. [INFERENCE]

## 3. Does Apple bless "consent via accepted T&C"?

**No Apple text found that accepts T&C acceptance as consent.** [SEARCHED, NOT FOUND]

- 5.1.1(ii) speaks of "secur[ing] user consent for the collection" as a distinct act, paired with "purpose strings" and a way to "withdraw consent" — language modeled on runtime permission flows, not contract acceptance. [INFERENCE from quoted text]
- 5.1.1(i) treats the privacy policy as *disclosure*, separate from the *consent* obligation in (ii). Disclosure ≠ consent: they are two different subsections with different verbs ("identify/explain" vs "secure consent"). [INFERENCE from quoted text]
- 5.1.2(i) uses "explicit permission" for sharing/tracking. [QUOTED above]
- The only collection-without-consent path Apple names is the GDPR legitimate-interest sentence in 5.1.1(ii) [QUOTED above]. That is a legal-basis argument, not a T&C argument, and it imports "all terms of that law" — under GDPR/ePrivacy (ePrivacy Directive Art. 5(3), as applied by EU DPAs to app analytics), non-essential analytics generally require consent anyway, and GDPR Art. 7(2) forbids burying consent inside broader terms. [INFERENCE — EU law characterization from general knowledge, not fetched primary EU sources]

## 4. Rejection cases and precedents

- **Firebase Analytics rejection** (Apple Developer Forums thread 688582, accessed 2026-08-11): rejected under 5.1.2 despite a custom in-app consent page; Apple demanded ATT. Shows reviewers scrutinize analytics SDK traffic and do not accept ad-hoc consent substitutes when they classify the flow as tracking. [DOCUMENTED]
- **Common rejection pattern** per practitioner postmortems (<https://ptkd.com/journal/guideline-5-1-1-data-collection-and-storage-fix>, <https://shopapper.com/fix-apple-rejection-app-store-guideline-5-1-1-privacy-issues/>, accessed 2026-08-11): analytics SDK initialized at app launch before any consent → rejected; fix is to delay initialization until consent is captured. [SECONDARY SOURCE]
- **Apple's own precedent**: Apple's Device Analytics legal notice (<https://www.apple.com/legal/privacy/data/en/device-analytics/>, accessed 2026-08-11) frames device analytics as conditional on consent — [QUOTED] "If you have consented to provide Apple with this information…" — and documents withdrawal: [QUOTED] "go to Settings > Privacy & Security > Analytics & Improvements, and turn off Share iPhone Analytics." The iOS Setup Assistant presents a dedicated "Share with Apple / Don't Share" analytics screen — i.e. Apple itself uses a dedicated prompt + Settings withdrawal, exactly Salmon's status quo. [Setup-screen detail: WELL-KNOWN OBSERVATION, not quoted from a fetched page]
- **Counter-observation** [INFERENCE]: a large share of shipped apps run Firebase/GA default-on with no prompt and pass review. Enforcement is inconsistent and often triggered only when reviewers notice network traffic or SDK signatures. Salmon's server-side proxy makes the collection invisible to automated SDK scans — which lowers detection probability, not compliance. Relying on non-detection is a policy violation with deferred risk (removal per 5.1.2: "Apps that share user data without user consent … may be removed from sale").

## 5. Variant evaluation

| Variant | Verdict | Supporting text |
|---|---|---|
| (a) T&C burial alone (no toggle) | **Does not comply** | Fails both prongs of 5.1.1(ii): no secured consent for collection ("must secure user consent … even if … anonymous") and no withdrawal route ("must also provide … an easily accessible and understandable way to withdraw consent") |
| (b) T&C-bundled "consent" + Settings opt-out toggle | **Gray zone, leaning non-compliant** | Withdrawal prong arguably satisfied by the toggle; consent prong rests on the unsupported claim that T&C acceptance = "secur[ing] user consent". No Apple text supports bundled consent; 5.1.2 demands "explicit permission" for adjacent obligations; GDPR carve-out only helps if full GDPR/ePrivacy compliance holds, which for analytics generally requires consent anyway. Survives review mainly via non-detection. [Verdict labels are INFERENCE from quoted text] |
| (c) Dedicated opt-in prompt + Settings toggle (status quo, spec 005) | **Complies** | Directly satisfies both quoted prongs of 5.1.1(ii); matches Apple's own device-analytics pattern (consent + Settings withdrawal) |

## 6. Risk assessment (rejection/removal likelihood)

- (a) T&C alone: textually indefensible if challenged. Detection risk lowered by server-side proxy (no SDK signature), but any reviewer network inspection, App Privacy label cross-check, or user complaint exposes it. For a crypto wallet — a category Apple already reviews with elevated scrutiny (guideline 3.1.5) — the reputational and removal downside is asymmetric. Estimated: low detection probability per review cycle, high severity if detected.
- (b) T&C + opt-out: same detection profile; slightly better defense in an appeal (disclosure + withdrawal exist), but the consent prong remains unsupported by any Apple text. Gray zone.
- (c) Status quo: no 5.1.1(ii) exposure.
- App Privacy labels note [INFERENCE]: whatever variant ships, the App Privacy questionnaire must still declare Usage Data collection — proxying through your own backend does not exempt disclosure, and a mismatch between labels and observed behavior is itself a documented rejection trigger.

## 7. Open questions

1. Does the tech-lead push for default-on target iOS specifically, or all platforms? Web/extension are outside App Review; only `apps/mobile` iOS is bound by 5.1.1(ii). (Google Play has its own, weaker prompt requirements — not researched here.)
2. Is a "deferred prompt" acceptable to leads as a compromise — collect nothing until the dedicated prompt, but make the prompt's default-highlighted action "Allow"? That preserves compliance while maximizing opt-in rate. [Not evaluated against Apple text; the prompt itself is what 5.1.1(ii) wants.]
3. EU-law leg (GDPR Art. 6(1)(f) legitimate interest vs ePrivacy consent for analytics) was characterized from general knowledge, not fetched primary EU sources. If leads want to litigate the GDPR carve-out sentence, commission a separate legal review — App Review is not the only regulator in scope for an EU-distributed wallet.
4. Whether Apple's reviewers currently (2026) run MITM network inspection on wallet-category apps was not verifiable from public sources.

## Sources

- App Review Guidelines — <https://developer.apple.com/app-store/review/guidelines/> (2026-08-11)
- User Privacy and Data Use — <https://developer.apple.com/app-store/user-privacy-and-data-use/> (2026-08-11)
- Apple Device Analytics notice — <https://www.apple.com/legal/privacy/data/en/device-analytics/> (2026-08-11)
- Firebase/ATT rejection thread — <https://developer.apple.com/forums/thread/688582> (2026-08-11)
- 5.1.1 registration-wall rejection thread (checked, not analytics-relevant) — <https://developer.apple.com/forums/thread/802498> (2026-08-11)
- Practitioner postmortems — <https://ptkd.com/journal/guideline-5-1-1-data-collection-and-storage-fix>, <https://shopapper.com/fix-apple-rejection-app-store-guideline-5-1-1-privacy-issues/> (2026-08-11)
