# Default-on anonymous analytics — Google Play (Android) and Web, under GDPR/ePrivacy

Research date: 2026-08-11. Sources accessed 2026-08-11 unless noted.
Scope: Salmon Wallet's pipeline as documented in `../salmon-api/docs/ANALYTICS.md` —
random per-install `install_id`, allow-listed props only, batched to own backend
Lambda, forwarded server-side to GA4 Measurement Protocol; client IP never sent to
Google (no `ip_override`, no Google SDK on any client); web persists the id in
`localStorage`, no cookies.

Labeling convention: **[QUOTED]** = verbatim from the source. **[INFERRED]** = my
analysis on top of sources.

---

## TL;DR per surface

| Surface | Verdict | Short reason |
|---|---|---|
| **Android / Google Play (store policy)** | **Default-on OK** | Play requires accurate Data Safety declaration + privacy policy, not consent, for analytics within reasonable user expectations. Must declare "Device or other IDs" as collected for Analytics. |
| **Android / EU law** | **Gray zone → needs consent to be safe** | EDPB Guidelines 2/2023: reading/sending a locally stored identifier from a mobile app is "gaining access" under ePrivacy Art 5(3) → consent unless a national audience-measurement exemption fits. CNIL-style exempt config is arguably met on the tech side, but GA4 forwarding likely disqualifies the exemption ("own use only" / large-provider caveat). |
| **Web, EU users** | **Same gray zone as Android-EU** | `localStorage` counts identically under Art 5(3) (no cookie needed). Server-side proxy with no IP largely moots the 2022 GA-transfer decisions (CNIL itself blessed "proxyfication"), but the *storage/access* consent question is separate and survives. |
| **Web + Android, non-EU users** | **Default-on OK** (jurisdictions vary) | Neither GDPR nor ePrivacy applies; Play policy satisfied by disclosure. Check local regimes (UK PECR mirrors ePrivacy; US states generally allow with notice/opt-out). |

Practical bottom line **[INFERRED]**: default-on with a prominent settings opt-out is
a defensible *risk-managed* position for this specific pipeline (no IP to Google, no
cross-site/app tracking, bucketed values), but it is not clean-letter compliant with
ePrivacy Art 5(3) for EU users because the GA4 backend disqualifies the CNIL
audience-measurement exemption. The clean options are: (a) consentless-by-design
with a CNIL-exemptible sink (self-hosted, e.g. Matomo/own NDJSON) for EU traffic, or
(b) a lightweight one-time consent prompt for EU users. Note the backend doc already
describes the pipeline as "opt-in" — see Open questions.

---

## 1. Google Play policy

### 1a. Data Safety section (support.google.com/googleplay/android-developer/answer/10787469)

- **[QUOTED]** "There is no new disclosure in the user app install process, and
  there is no new user consent related to this feature." → the Data Safety form is
  disclosure, not consent.
- **[QUOTED]** "Collect" means transmitting data off the device; exemptions:
  "User data accessed by your app that is only processed locally on the user's
  device and not sent off device does **not** need to be disclosed", and ephemeral
  in-memory processing.
- **[QUOTED]** Category "Device or other IDs": "Identifiers that relate to an
  individual device, browser or app. For example, an IMEI number, MAC address,
  Widevine Device ID, Firebase installation ID, or advertising identifier."
- **[INFERRED]** `install_id` is functionally a Firebase-installation-ID analogue →
  must be declared as **collected**, category *Device or other IDs*, purpose
  *Analytics*, "data is not shared" is defensible only if forwarding to GA4 with
  the developer as sole property owner counts as processing on the developer's
  behalf — Play's form treats transfer to a service provider processing on your
  behalf as *not* "sharing"; declare conservatively and document the processor
  relationship.

### 1b. User Data policy (support.google.com/googleplay/android-developer/answer/10144311)

- **[QUOTED]** Prominent disclosure + affirmative consent required when
  "access, collection, use, or sharing of personal and sensitive user data may not
  be within the reasonable expectation of the user" (esp. background collection).
- **[QUOTED]** Personal and sensitive user data = "personally identifiable
  information, financial and payment information, authentication information,
  phonebook, contacts, device location, SMS and call-related data, health data,
  Health Connect data, inventory of other apps on the device, microphone, camera,
  and other sensitive device or usage data."
- **[INFERRED]** Foreground, PII-free, bucketed usage analytics tied to a random
  per-install id sits inside "reasonable expectation" for an app that discloses it
  in its privacy policy; it is not in the enumerated sensitive list. So **Play does
  not require a consent prompt** — it requires an accurate Data Safety declaration
  and privacy-policy disclosure. (Play policy compliance ≠ EU law compliance; Play
  separately requires you to comply with applicable law.)

**Play verdict: default-on viable.** Required actions: declare Device/other IDs +
app interactions collected for Analytics in Data Safety; disclose in privacy policy.

---

## 2. GDPR — is `install_id` personal data, and what lawful basis?

### Is it personal data?

- **[QUOTED]** Recital 26 (gdpr-info.eu/recitals/no-26/): "Personal data which have
  undergone pseudonymisation, which could be attributed to a natural person by the
  use of additional information should be considered to be information on an
  identifiable natural person." And: anonymous information is "information which
  does not relate to an identified or identifiable natural person… This Regulation
  does not therefore concern the processing of such anonymous information,
  including for statistical or research purposes." Identifiability is judged by
  "all objective factors, such as the costs of and the amount of time required for
  identification."
- **[QUOTED]** Recital 30 (gdpr-info.eu/recitals/no-30/): "Natural persons may be
  associated with online identifiers provided by their devices, applications,
  tools and protocols, such as internet protocol addresses, cookie identifiers or
  other identifiers such as radio frequency identification tags… may be used to
  create profiles of the natural persons and identify them."
- **[QUOTED]** Austrian DSB decision 2021-0.586.257 (via GDPRhub / noyb summaries):
  data collected by Google Analytics — "unique identification numbers, IP address,
  and browser parameters" — constituted personal data under Art 4(1); the unique
  online identifiers were "sufficient to identify the data subject" in combination.
- **[INFERRED]** A random per-install id is a device/app-provided online identifier
  that singles out one installation over time → regulators will treat it as
  **pseudonymous personal data**, not anonymous, even with no PII attached. Plan
  on GDPR applying to the event stream. (The *aggregated GA4 reports* are
  anonymous; the ingested events are not.)

### Lawful basis

- **[INFERRED, supported by CNIL's regime]** Consent (Art 6(1)(a)) or legitimate
  interest (Art 6(1)(f)) are the only realistic bases. CNIL's audience-measurement
  exemption regime presupposes that GDPR-side processing of exempt analytics rests
  on a non-consent basis — i.e. first-party audience measurement is a recognized
  legitimate interest when narrowly scoped, with information + objection (opt-out)
  honoring Art 21. The Salmon pipeline's minimization (allow-list, buckets, no IP
  to Google, no cross-context linkage) is strong balancing-test material.
- **[INFERRED]** The GDPR question is therefore *passable* with legitimate
  interest + privacy-policy disclosure + opt-out. The binding constraint is not
  GDPR Art 6 — it is ePrivacy Art 5(3) (below), which where it applies demands
  consent *regardless* of lawful basis under GDPR.

### Do the 2022–2023 GA decisions still bite?

- The Austrian DSB (Jan 2022), CNIL (Feb 2022 formal notices), and Italian Garante
  (June 2022) decisions hinged on **transfers to Google LLC (US) of IP + cookie
  identifiers** post-Schrems II — client-side GA, device talking to Google.
  Sources: gdprhub.eu (DSB 2021-0.586.257), noyb.eu, williamfry.com, loyensloeff.com.
- **[QUOTED, via CNIL follow-up guidance summaries — Lexology, addingwell docs]**
  CNIL held that a proxy server "that avoids direct contact between the user's
  terminal and Google's servers could be considered a sufficient supplementary
  measure", conditions including: "no transfer of the IP address to the servers of
  the audience measurement tool", no user-agent/raw identifiers usable for
  re-identification, proxy fully controlled by the operator, hosted under adequate
  conditions.
- **[INFERRED]** Salmon's architecture *is* CNIL's proxyfication pattern, done
  better than GTM-server-side (no Google code anywhere client-side, no IP ever
  captured by the analytics path). The Schrems-II/transfer line of attack is
  substantially mooted: what reaches Google US is `install_id` + bucketed enums,
  with server IP. Residual risk: `install_id` itself is still an online identifier
  transferred to Google US; under EU–US Data Privacy Framework (Google is
  certified) plus the minimization, this is low risk. The 2022 decisions do NOT
  stand for "GA4 is banned"; they stand for "device-to-Google with IP+cookies was
  unlawful without supplementary measures."

---

## 3. ePrivacy Art 5(3) — the actual blocker

Source: EDPB Guidelines 2/2023 on the technical scope of Art. 5(3) ePrivacy
Directive, final version adopted 7 Oct 2024
(edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf).

- **Applies regardless of personal data** — **[QUOTED]** para 10 (citing CJEU):
  "That protection applies to any information stored in such terminal equipment,
  regardless of whether or not it is personal data"; para 12: "the notion of
  information includes both non-personal data and personal data, regardless of how
  this data was stored and by whom."
- **Mobile devices are terminal equipment** — **[QUOTED]** para 17: terminal
  equipment includes "smartphones, laptops, network-attached storage device,
  connected cars or connected TVs, smart glasses."
- **Sending a stored identifier off-device = "gaining access"** — **[QUOTED]**
  para 33: covered "when the accessing entity distributes software on the terminal
  equipment of the user that is stored and will then proactively call an
  Application Programming Interface ('API') endpoint over the network." Para 34:
  "Instructing the device to send already stored information… makes an intrusion
  into the terminal equipment possible, therefore such an access triggers the
  applicability of Article 5(3) ePD."
- **Unique identifiers specifically** — **[QUOTED]** para 63: "In the context of
  'unique identifier' collection on websites or mobile applications, the entity
  collecting is instructing the browser (through the distribution of client-side
  code) to send that information. As such a 'gaining of access' is taking place
  and Article 5(3) ePD applies."
- **[INFERRED]** This covers both surfaces identically: web `localStorage` (write =
  storage, read+POST = access) and the mobile app's local persistence of
  `install_id`. "No cookies" does not help — Art 5(3) is storage-medium-agnostic.
- **Consent not always required** — **[QUOTED]** para 56: "the applicability of
  this article does not systematically mean that consent needs to be collected…
  it would have to be assessed if a consent is needed or whether an exemption
  under Article 5(3) ePD could apply."
- **Strictly-necessary exemption** — **[QUOTED]** Art 5(3) text (as reproduced in
  the Guidelines, fn 4): exemption only "as strictly necessary in order for the
  provider of an information society service explicitly requested by the
  subscriber or user to provide the service." **[INFERRED]** Analytics is not
  strictly necessary; the exemption does not cover it. This is settled regulator
  consensus.

### National audience-measurement carve-outs (CNIL)

Source: CNIL sheet 16, "Use analytics on your websites and applications"
(cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications).

- **[QUOTED]** Exemption conditions: "inform users of their use", "give them the
  ability to object to their use", purposes limited to audience measurement/A-B
  testing, no combining with other data or cross-site statistics, "limit the scope
  of the tracer to a single site or application", "truncate the last byte of the
  IP address", "limit the lifetime of the trackers to 13 months."
- **[QUOTED]** "Most large audience measurement offerings do not fall within the
  scope of the exemption, regardless of their configuration." Self-hosted
  configurable tools (Matomo named) can qualify.
- **[INFERRED]** Salmon meets the *technical* conditions almost by construction
  (single-app scope, no data crossing, no IP at all — stronger than truncation),
  except: (a) `install_id` has no 13-month expiry, (b) opt-out must exist and be
  disclosed, and (c) the sink is **GA4** — a "large audience measurement offering"
  whose terms let Google use data for its own purposes, which is exactly why CNIL
  refuses to exempt it. Server-side proxying fixed the *transfer* problem, not the
  *exemption-eligibility* problem. So under CNIL's published position, default-on
  in France (and by analogy in stricter member states) is not covered by the
  exemption while GA4 is the sink.
- **[INFERRED]** The carve-out is national, not EU-wide: it exists in France
  (Art 82 LIL), with analogous positions elsewhere varying; no harmonized
  ePrivacy-Regulation replacement has landed as of the research date.

---

## 4. Bottom line per surface

| Surface | Regime | Verdict | Mitigations if default-on |
|---|---|---|---|
| Android — Play store policy | Play Data Safety + User Data policy | **Default-on OK** | Accurate Data Safety form (Device/other IDs + interactions, Analytics), privacy policy link |
| Android — EU users | ePrivacy Art 5(3) via national law + GDPR | **Needs consent** on the letter (para 63 covers apps); **gray zone** in practice given anonymity-by-design | Prominent opt-out in settings, disclosure at onboarding, 13-month id rotation, consider EU-only consent gate or exemptible sink |
| Web — EU users | ePrivacy Art 5(3) (localStorage counts) + GDPR | **Needs consent** on the letter; CNIL exemption unavailable while GA4 is the sink | Same as above; swapping the *sink* (own NDJSON/Matomo) for EU users would make consentless lawful under CNIL conditions |
| Web/Android — non-EU | Local law only; Play policy | **Default-on OK** | Privacy-policy disclosure; opt-out; check UK (PECR ≈ ePrivacy — treat UK like EU), Brazil LGPD, US state laws (notice/opt-out model) |

### Risk table

| Risk | Likelihood | Impact | Notes |
|---|---|---|---|
| Play rejection/removal over Data Safety | Low | Medium | Purely a form-accuracy issue; fix by declaring correctly |
| EU DPA enforcement over consentless analytics id | Low–Medium | Low–Medium | Enforcement to date targets IP+cookie / cross-site tracking and large publishers; a no-IP, no-PII, single-app id with opt-out is an unattractive target, but formally non-compliant (Art 5(3)) |
| Schrems-style transfer complaint (GA4 US) | Low | Low | Proxy + no IP moots the 2022 fact pattern; DPF currently valid |
| Reputational (crypto wallet "phones home by default") | Medium | Medium | Self-custodial user base is privacy-sensitive; opt-in may be worth it commercially regardless of law |

## Open questions

1. **Doc conflict**: `../salmon-api/docs/ANALYTICS.md` line 3 already calls the
   wallet events "opt-in". Is default-on a proposed change, or is the backend doc
   aspirational? Resolve before shipping — the legal answer differs.
2. Frontend `docs/ANALYTICS.md` (event catalogue + client opt-in) referenced by the
   backend doc — confirm what consent surface, if any, is already built.
3. Whether to geo-split behavior (EU/UK consent or exemptible sink vs. default-on
   elsewhere) or ship one global policy — product decision.
4. `install_id` lifetime: unlimited today; CNIL exemption path would need ≤13-month
   rotation.
5. Member states other than France: no exhaustive survey done of national
   audience-measurement carve-outs (Germany TTDSG §25, Spain AEPD, etc.).

## Sources (accessed 2026-08-11)

- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- GDPR Recital 26: https://gdpr-info.eu/recitals/no-26/ · Recital 30: https://gdpr-info.eu/recitals/no-30/
- EDPB Guidelines 2/2023 (final, 7 Oct 2024): https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf
- CNIL sheet 16, analytics: https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications
- CNIL proxyfication follow-up (summaries): https://www.lexology.com/library/detail.aspx?g=810b2c0a-d900-4a9d-b2b7-7796366a9367 · https://docs.addingwell.com/en/cnil-proxyfication
- Austrian DSB 2021-0.586.257: https://gdprhub.eu/index.php?title=DSB_%28Austria%29_-_2021-0.586.257_%28D155.027%29 · https://noyb.eu/en/austrian-dsb-eu-us-data-transfers-google-analytics-illegal
- Context on 2022 GA rulings: https://www.williamfry.com/knowledge/explained-the-austrian-data-regulators-issue-with-google-analytics/ · https://www.loyensloeff.com/insights/news--events/news/data-protection-authorities-say-no-to-google-analytics-whats-next/
- Pipeline facts: `../salmon-api/docs/ANALYTICS.md` (local repo)
