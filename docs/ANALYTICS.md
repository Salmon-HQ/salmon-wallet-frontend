# Analytics anónimas — catálogo de eventos y métricas

Este documento es la referencia de **qué medimos, con qué datos, y qué métricas
se pueden calcular con eso**. Es un documento de *estado real*: marca lo que hoy
se emite de verdad y, explícitamente, lo que **no se puede** medir con el diseño
actual. No promete cobertura que no existe.

## Postura de privacidad

Las analytics son **anónimas y opt-in**. El usuario arranca sin consentimiento y
el cliente es **no-op total** hasta que lo otorga: no valida, no encola, no
persiste y no envía nada.

La anonimidad se garantiza por **allow-list, no por deny-list**:

- Solo pueden emitirse los 15 eventos del catálogo.
- Un evento solo puede llevar props de `ALLOWED_PROP_KEYS`.
- Un guardrail rechaza cualquier valor que parezca address o mint (base58 32–44,
  hex 0x+40), números crudos y strings largos (>32 chars).
- **Nunca** viaja una address, un monto exacto, un mint, ni nada derivado de la
  seed.

La validación corre **dos veces, independientemente**: en el cliente antes de
enviar, y de nuevo en el backend al ingerir (defensa en profundidad — un cliente
adulterado o desactualizado no puede colar PII).

Retirar el consentimiento **borra la cola y el install id**.

## Dónde vive cada cosa

| Pieza | Ubicación |
|---|---|
| Catálogo (fuente de verdad) | `packages/shared/src/analytics/events.ts` |
| Guardrail de anonimidad | `packages/shared/src/analytics/schema.ts` |
| Cliente (consent, batching, retry) | `packages/shared/src/analytics/client.ts` |
| Transport HTTP | `packages/shared/src/analytics/transport.ts` |
| Eventos "primera vez" | `packages/shared/src/analytics/first-time.ts` |
| Hook de consentimiento | `packages/shared/src/hooks/useAnalyticsConsent.ts` |
| Espejo en el backend | `salmon-api/src/analytics/event-schema.js` |
| Ingesta en el backend | `salmon-api/src/analytics/handler.js` (`POST /v1/events`) |

> El catálogo del wallet y el espejo de `salmon-api` **deben mantenerse en sync**.
> Un cambio en uno obliga al otro.

## Contexto adjunto a todo evento

No lo manda cada evento: lo agrega el envelope del batch y el handler.

| Campo | Qué es |
|---|---|
| `install_id` | Random por instalación. **No** derivado de la wallet ni de la seed. |
| `session_id` | Efímero, rota por sesión. |
| `platform` | `mobile` \| `web` \| `extension` |
| `app_version` | Versión de la app. |
| `ts` | Epoch ms del cliente (cuándo ocurrió). |
| `received_at` | Epoch ms del server (cuándo se ingirió). |
| `dt` | `YYYY-MM-DD` — clave de partición. |

## Props permitidas

Solo estas cinco claves. Cualquier otra es rechazada.

| Prop | Valores |
|---|---|
| `chain` | `solana` \| `bitcoin` \| `ethereum` |
| `from_chain` | idem |
| `to_chain` | idem |
| `success` | `true` \| `false` |
| `amount_bucket` | `0-10` \| `10-100` \| `100-1k` \| `1k-10k` \| `10k+` |

## Catálogo: los 15 eventos

Los eventos se cablean **en el hook compartido cuando existe**, para que una sola
llamada cubra mobile + web + extension. Los que dependen de UI se cablean en la
pantalla mobile y en el componente DOM compartido.

### Onboarding

| Evento | Props | Se dispara en | Cableado en |
|---|---|---|---|
| `onboarding_started` | — | Mount de la pantalla Welcome/Select | `apps/mobile/app/(auth)/index.tsx` + `packages/ui/.../AuthFlow/SelectOptionsPage.tsx` |
| `wallet_created` | — | Éxito del password, flow `create` | `apps/mobile/app/(auth)/password.tsx` + `packages/ui/.../AuthFlow/PasswordPage.tsx` |
| `wallet_recovered` | — | Éxito del password, flow `recover` | idem |
| `biometric_enabled` | — | Al activar biometría | `apps/mobile/app/(auth)/biometric-setup.tsx` (solo mobile) |

### Activación (una sola vez por instalación)

Usan `trackFirstTime()`: emiten el evento **una vez**, con un flag persistido por
evento. El flag **solo se consume cuando el evento efectivamente se emitió** (o
sea, con consent activo), así que un usuario que hace su primer swap *antes* de
optar-in sigue contando en su primer swap *después* de optar-in.

| Evento | Props | Se dispara en | Cableado en |
|---|---|---|---|
| `first_receive_viewed` | — | 1ª apertura del sheet de Receive | `apps/mobile/.../ReceiveSheet.tsx` + `packages/ui/.../ReceiveSheet.tsx` |
| `first_send_completed` | — | 1er send exitoso | `packages/shared/src/hooks/useSendTransaction.ts` |
| `first_swap_completed` | — | 1er swap exitoso | `packages/shared/src/hooks/useSwap.ts` |

### Uso recurrente

| Evento | Props | Se dispara en | Cableado en |
|---|---|---|---|
| `send_completed` | `chain`, `success: true` | Transfer exitoso | `packages/shared/src/hooks/useSendTransaction.ts` |
| `swap_completed` | `from_chain: solana`, `to_chain: solana`, `success: true` | Swap exitoso (Jupiter = Solana↔Solana) | `packages/shared/src/hooks/useSwap.ts` |
| `nft_viewed` | `chain` | Abrir detalle de NFT | `apps/mobile/.../NftDetailSheet.tsx` + `packages/ui/.../NftDetailPage.tsx` |
| `nft_sent` | `chain` | Transfer de NFT exitoso | `packages/shared/src/hooks/useNftTransfer.ts` |

### Adopción de features

| Evento | Props | Se dispara en | Cableado en |
|---|---|---|---|
| `settings_opened` | — | Abrir settings | `apps/mobile/.../SettingsSheet.tsx` + `packages/ui/.../SettingsPanelStack.tsx` |
| `network_switched` | `chain` (red destino) | `changeNetwork` | `packages/shared/src/hooks/useAccountsSelection.ts` |
| `wallet_switched` | — | `changeAccount` | `packages/shared/src/hooks/useAccountsSelection.ts` |
| `address_book_used` | — | `addContact` | `packages/shared/src/hooks/useAddressbook.ts` |

## Métricas por evento

Qué vamos a calcular con cada uno.

### Activación y time-to-value

| Métrica | Cómo se calcula |
|---|---|
| Tasa de activación de send | `installs con first_send_completed / installs consentidas` |
| Tasa de activación de swap | `installs con first_swap_completed / installs consentidas` |
| Tasa de activación de receive | `installs con first_receive_viewed / installs consentidas` |
| Time-to-first-send / swap / receive | `ts` del `first_*` − `ts` del primer evento de ese `install_id` |
| Orden de activación | Qué `first_*` ocurre primero por `install_id` (¿reciben antes de enviar?) |

### Uso recurrente y engagement

| Métrica | Cómo se calcula |
|---|---|
| Volumen de sends / swaps | `count(send_completed)`, `count(swap_completed)` por `dt` |
| Mix por chain | `count(send_completed) group by chain` — qué cadenas se usan de verdad |
| Sends por usuario activo | `count(send_completed) / count(distinct install_id)` |
| Ratio send vs swap | Qué tipo de operación domina |
| Uso de NFT | `nft_viewed` → `nft_sent` (view-to-send de NFTs), por `chain` |

### Retención

| Métrica | Cómo se calcula |
|---|---|
| DAU / WAU / MAU | `count(distinct install_id) por dt` (o ventana) |
| Retención D1 / D7 / D30 | Cohortes por primer `dt` visto de cada `install_id` |
| Stickiness | `DAU / MAU` |
| Profundidad de sesión | `count(eventos) group by session_id` |
| Sesiones por install | `count(distinct session_id) group by install_id` |

### Adopción de features

| Métrica | Cómo se calcula |
|---|---|
| % que abre settings | `installs con settings_opened / installs consentidas` |
| % multi-chain | `installs con network_switched / total`, y a qué `chain` cambian |
| % multi-wallet | `installs con wallet_switched / total` |
| % que usa address book | `installs con address_book_used / total` |
| Descubrimiento de features | Qué features toca un install en sus primeros N días |

### Cortes transversales

Todo lo anterior se puede segmentar por `platform` (mobile / web / extension) y
por `app_version` (para detectar regresiones o adopción de releases).

## Limitaciones conocidas (leer antes de diseñar una métrica)

### 1. El funnel de onboarding de primera vez NO es medible

La pantalla de consentimiento está al **final** del onboarding:

```
welcome → create/recover → password → biometric → CONSENT → app
```

Como el cliente es no-op sin consent, en el **primer** onboarding los eventos
`onboarding_started`, `wallet_created`, `wallet_recovered` y `biometric_enabled`
**no se emiten**. Solo aparecen cuando un usuario **ya consentido** vuelve a
pasar por ese flujo (p. ej. agrega una segunda cuenta).

Consecuencia: esos 4 eventos miden *"usuario consentido rehaciendo el flujo"*,
**no adquisición ni conversión de onboarding**. No los uses como funnel de alta.

Es correcto por diseño (opt-in real: no se puede medir a quien todavía no
consintió). Si se quisiera medir el funnel de alta habría que mover el prompt de
consent **antes** en el flujo — decisión de producto/legal, no técnica.

### 2. No hay tasa de éxito ni de error

Solo emitimos en el camino feliz: `success` hoy **siempre vale `true`** y no hay
eventos de intento ni de fallo. Se pueden contar *completions*, pero **no**
calcular conversion rate ni error rate: falta el denominador.

Para habilitarlo habría que emitir el evento también en el path de error (con
`success: false`), o agregar eventos de intento al catálogo.

### 3. `amount_bucket` está definido pero no se emite

La prop existe en el allow-list y el helper `toAmountBucket()` ya está en
`events.ts`, pero **ningún evento la manda hoy**. No se puede segmentar send/swap
por tamaño de operación hasta que se pase en `useSendTransaction` / `useSwap`.

### 4. Sin identidad ni valor

Por diseño no hay forma de: atribuir a un usuario real, cohortizar por wallet,
medir balances/TVL, ni ligar eventos a una address. `install_id` se pierde si el
usuario reinstala o retira el consentimiento.

## Verificación local

El stack local de `salmon-api` (`docker-compose.yml`) sirve la API de la wallet
**y** el ingest de analytics en el mismo puerto, con file-sink a NDJSON:

```bash
# en ../salmon-api
docker compose up -d           # mysql + redis + backend (serverless-offline)
```

El backend expone `POST /local/v1/events`. Con `ANALYTICS_SINK=file` (ya seteado
en el compose) los eventos se appendean a `.analytics-local/events.ndjson`.

Apuntar la app al stack local:

```bash
# en apps/mobile — la IP debe ser la LAN del host, no localhost (iOS Simulator)
EXPO_PUBLIC_API_URL=http://<IP-LAN>:<PORT>/local npx expo start --clear
```

Como el transport postea a `${API_URL}/v1/events`, los eventos viajan por la
misma base y caen en el NDJSON local.

Si se necesita mandar los eventos a un sink **distinto** del backend de la wallet
(p. ej. wallet contra prod pero eventos en local), existe una URL dedicada
opcional:

```bash
EXPO_PUBLIC_ANALYTICS_URL=http://<IP-LAN>:4319   # VITE_ANALYTICS_URL en web/ext
```

Cuando está seteada, el transport postea ahí en vez de a `API_URL`.

Inspeccionar lo ingerido:

```bash
cat ../salmon-api/.analytics-local/events.ndjson | jq -r .event | sort | uniq -c
```
