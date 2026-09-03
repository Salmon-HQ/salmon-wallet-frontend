# Arquitectura de Salmon Wallet

Este documento describe el monorepo por responsabilidades. El objetivo es que quede claro dónde vive cada tipo de código y cómo decidir ownership cuando se agrega algo nuevo. Las reglas canónicas están en el `AGENTS.md` de la raíz; acá está el porqué y la forma general.

## Idea general

Una wallet, dos aplicaciones, una lógica:

- `apps/mobile` — React Native / Expo (iOS y Android).
- `apps/extension` — extensión de navegador (WXT, MV3): el side panel es la app; el popup queda para las aprobaciones de dApps.
- `packages/shared` — todo lo que no dibuja: servicios, blockchain, hooks, contextos, contratos, storage, crypto, tokens de diseño, i18n. Corre en React Native y en el DOM.
- `packages/ui` — el kit React DOM de la extensión. Cada pieza es la gemela de una de `apps/mobile`.
- `packages/assets` — fuentes e imágenes.

La app web se retiró el 2026-09-02; la extensión es la única superficie DOM.

## Gemelas: la extensión es la app móvil sobre el DOM

Cada componente del kit y cada pantalla existen dos veces — una en React Native, otra en el DOM — sobre **un solo contrato** en `packages/shared/src/types/ui` (`XPropsBase`). El `types.ts` de cada plataforma lo extiende y el componente importa sus props de ahí. Un cambio en una gemela es un cambio en las dos; un tamaño, color o espaciado que comparten es un token en `packages/shared/src/theme`, nunca un literal repetido.

Lo que difiere por plataforma se elige a propósito y queda escrito (spec 028, "DOM alternatives"): Reanimated ↔ Web Animations API sobre las mismas constantes de `packages/shared/src/motion`; gestos ↔ teclado/rueda; safe areas ↔ `spacing.panelTop`.

`scripts/check-dom-parity.mjs` hace cumplir esto en CI (estricto):

| Check      | Garantiza                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| `theme`    | el DOM lee el modo vivo por `useSemantic()` — sin tokens estáticos, sin MUI, sin hex, sin `mode ===` |
| `twins`    | cada carpeta de `apps/mobile/src/components` tiene gemela en `packages/ui` y viceversa               |
| `contract` | las dos gemelas construyen sobre el mismo `*Base` (`extends`, no sólo import)                        |
| `dead`     | cada contrato de `types/ui` tiene lector                                                             |
| `screens`  | cada ruta de `apps/mobile/app` tiene su pantalla DOM                                                 |
| `clones`   | las líneas duplicadas mobile ↔ DOM (jscpd) no superan un techo que sólo baja                         |

Los mapas dentro del script (`MAP`, `MOBILE_ONLY`, `DOM_ONLY`, `SCREENS`, `MOBILE_ONLY_SCREENS`) son el único lugar donde puede vivir una diferencia de plataforma, cada una con su motivo. `pnpm check:parity` lo corre; `check:parity:report` muestra hallazgos sin fallar; `check:parity:test` corre sus fixtures.

## `packages/shared`

Es el núcleo. Capas, de abajo hacia arriba:

- `api/` — el contrato con el backend (`../salmon-wallet-backend`): cliente, configuración de entorno, servicios.
- `blockchain/` — lógica por cadena (`solana` sobre `@solana/kit`, `bitcoin`, `ethereum` como andamiaje futuro). Firma en el cliente. Solana envía al RPC que el backend nombra en `/v1/networks`; Bitcoin publica el hex firmado directamente a los relays públicos (`config/bitcoin-relays.ts`), nunca a nuestro backend.
- `crypto/`, `storage/` — material de claves, cifrado del vault, persistencia. Área sensible: no se cambia sin firma humana.
- `theme/` — la única fuente de tokens (`createSemantic(mode)` para claro y oscuro, spacing, tipografía, sombras, geometría de la marca).
- `motion/` — las constantes de movimiento que ambas plataformas leen.
- `types/` — tipos de dominio; `types/ui/` los contratos de las gemelas.
- `hooks/`, `contexts/`, `utils/`, `settings/` — **la lógica de pantalla, una sola vez.** El estado de un flujo (Home, Send, NFT, Wallets, Settings, confirmación con contraseña, cambio de contraseña, derivación de redes espejo, idioma) vive acá como hook o contexto que recibe inyectados la cuenta y las acciones; las plataformas son un proveedor delgado más el render. Las derivaciones puras (filas de actividad, cues del balance, orden de wallets, opciones de destinatario, geometría del gráfico de precio) son utilidades con test propio.
- `locales/` — EN y ES; toda cadena visible pasa por `t()`.

No contiene componentes DOM ni React Native.

## `packages/ui`

El kit DOM de la extensión: un componente por carpeta (`Component.tsx`, `types.ts`, `index.ts`), gemelo del de mobile, estilizado con emotion e inline styles sobre `useSemantic()`. El modo (sistema / claro / oscuro) lo da `SalmonThemeProvider`, que además expone los tokens como variables CSS `--sw-<grupo>-<token>`. No hay MUI ni librerías de gráficos: el `PriceChart` es SVG propio.

No contiene lógica de negocio: si un componente empieza a decidir comportamiento, eso sube a `packages/shared`.

## `apps/mobile`

Rutas de `expo-router` (`app/`), componentes React Native (`src/components`), integraciones nativas (biometría, captura de pantalla, teclado, haptics, safe areas) y el render de los contratos compartidos con `StyleSheet` y tokens. Nunca importa `packages/ui`.

## `apps/extension`

Entrypoints (`background`, `content`, `injected`, `sidepanel`, `popup`), las páginas que componen el kit, el Wallet Standard y la mensajería con el background. Las aprobaciones de dApps van sobre `surface.bedrock`: opacas, sin agua ni escamas.

Para desarrollar contra el backend local en Docker: `pnpm --filter @salmon/extension dev` y cargar `apps/extension/dist/chrome-mv3-dev` (lee `.env`); `wxt build` hornea `.env.production` y apunta a producción.

## Dónde va cada cosa

- Lógica que las dos apps necesitan → `packages/shared` (servicio, hook, contexto o utilidad según su forma).
- Componente visual → contrato en `packages/shared/src/types/ui` y una gemela por plataforma.
- Depende de una API nativa o de una API de extensión → se queda en su app, detrás de una interfaz que la otra plataforma también pueda cumplir.
- Un valor visual → token en `packages/shared/src/theme`.

Señales de mala ubicación: un componente RN o DOM en `shared`; lógica de producto dentro de `packages/ui`; un hook compartido que usa una API de plataforma; una app que reimplementa algo que `shared` ya tiene; un literal de diseño fuera de `theme`.

## Verificación

Desde la raíz, lo mismo que corre CI: `pnpm format:check`, `pnpm turbo run typecheck lint test`, `pnpm check:i18n`, `pnpm check:parity`. Para un paquete: `pnpm turbo run test --filter=@salmon/<pkg>` (`shared` y `ui` con Vitest, `mobile` con Jest). E2E: `apps/extension/.playwright`, `apps/mobile/.maestro`.
