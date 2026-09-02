# Arquitectura de Salmon Wallet V3

Este documento describe la arquitectura del monorepo por responsabilidades de carpetas. El objetivo es dejar claro dónde vive cada tipo de código y cómo decidir ownership cuando se agregan features nuevas.

## Idea General

El repo sigue una estructura de monorepo con separación por ownership y plataforma:

- `packages/shared`
  - lógica compartida entre mobile y extension
- `packages/ui`
  - componentes React DOM de la extension (la app web se retiró el 2026-09-02)
- `apps/mobile`
  - app React Native y UI mobile-only
- `apps/extension`
  - browser extension

Regla central:

- si algo tiene que funcionar en las tres plataformas, tiende a `packages/shared`
- si algo es UI DOM compartida solo entre web y extension, tiende a `packages/ui`
- si depende de APIs nativas, navegación mobile o concerns específicos de una app, se queda en su app

## Responsabilidades por Carpeta

### Raíz del repo

- `apps/`
  - entrypoints y superficies de cada aplicación
- `packages/`
  - código compartido y reusable dentro del monorepo
- `docs/`
  - documentación viva del repo
- `.agent/` y `.claude/`
  - workflow y skills de proyecto ya existentes
- `.codex/`
  - skills repo-locales para Codex

### `packages/shared/`

Es el núcleo lógico del monorepo.

Responsabilidad:

- servicios de API compartidos
- lógica blockchain
- hooks reutilizables
- tipos semánticos
- storage y configuración
- utilidades y crypto compartidos
- design tokens

Subcarpetas importantes:

- `packages/shared/src/api/`
  - clientes HTTP, configuración y servicios compartidos contra backend
- `packages/shared/src/blockchain/`
  - lógica blockchain por dominio
- `packages/shared/src/hooks/`
  - hooks cross-platform
- `packages/shared/src/theme/`
  - tokens visuales base
- `packages/shared/src/types/`
  - tipos semánticos compartidos
- `packages/shared/src/storage/`
  - contratos y helpers de persistencia
- `packages/shared/src/utils/`
  - utilidades realmente compartidas

No debería contener:

- componentes DOM específicos
- componentes React Native
- lógica dependiente de una sola app sin reutilización real

### `packages/ui/`

Responsabilidad:

- componentes React DOM compartidos entre web y extension
- layouts DOM compartidos
- utilidades visuales específicas de esa capa

No debería contener:

- lógica de negocio pesada
- hooks que pertenecen a `packages/shared`
- código React Native

### `apps/mobile/`

Responsabilidad:

- implementación React Native
- componentes mobile-only
- adaptaciones de contratos compartidos a UI nativa
- navegación y concerns del runtime mobile

No debería contener:

- lógica que debería reutilizarse en la extension
- componentes DOM

### `apps/extension/`

Responsabilidad:

- shell de browser extension
- entrypoints de background/content/injected
- páginas y sheets propias de extension
- compatibilidad con browser APIs

## Ownership por tipo de cambio

### Nuevo endpoint o integración de backend

- si el consumo es compartido, entra por `packages/shared/src/api/services`
- si el contrato afecta hooks o tipos, se actualizan en `packages/shared`
- las apps consumen ese contrato, pero no deberían reinventarlo

### Nueva lógica blockchain

- si aplica a más de una plataforma, vive en `packages/shared/src/blockchain/<chain>`
- si es solo wiring visual o interacción de una app, se queda en la app

### Nuevo hook

- si es cross-platform y semántico, va a `packages/shared/src/hooks`
- si depende de browser APIs o React Native APIs, debe vivir en la app correspondiente

### Nuevo componente

- si es DOM compartido entre web y extension, va a `packages/ui`
- si es React Native, va a `apps/mobile`
- si es específico de una app web/extension, se queda en esa app

## Capas importantes dentro de `packages/shared`

### `api`

- contrato compartido con backend
- servicios reutilizables por varias apps

### `blockchain`

- lógica por cadena
- adapters y helpers semánticos del dominio crypto

Hoy las carpetas activas visibles son:

- `bitcoin`
- `ethereum`
- `solana`

La intención es mantener la lógica por chain aislada, sin mezclar concerns entre dominios.

Stack Solana: la lógica de Solana usa `@solana/kit` v7 y los clientes de programa de
`@solana-program/*`. `@solana/web3.js` v1 no está en ninguna dependencia de producción; sobrevive
sólo como devDependency, usado como oráculo independiente en los tests. Ver
`docs/SOLANA_KIT_MIGRATION.md`.

### `hooks`

- orquestan estado y comportamiento reutilizable
- conectan servicios, blockchain logic, storage y tipos

### `theme`

- fuente única de tokens compartidos
- colores, spacing, typography, sombras y duraciones

## Testing

Regla práctica:

- lógica compartida: test en `packages/shared`
- componentes DOM compartidos: test en `packages/ui`
- UI o integración React Native: test en `apps/mobile`
- wiring específico web/extension: test en su app cuando realmente agregue valor

Prioridad:

- unit e integration tests para lógica compartida
- UI tests solo cuando el comportamiento visible sea importante
- E2E contra backend solo si no hay cobertura suficiente en `../salmon-wallet-backend`

## Señales de mala ubicación

- un componente React Native aparece en `packages/shared` o `packages/ui`
- un componente DOM compartido empieza a contener lógica de negocio grande
- un hook compartido usa APIs browser-only o native-only
- una app duplica contratos que ya existen en `packages/shared`
- tipos visuales específicos terminan en tipos semánticos compartidos

## Estado actual de diseño

La separación principal del monorepo está bien:

- `packages/shared` como núcleo compartido
- `packages/ui` como capa DOM compartida
- apps separadas por runtime

La disciplina importante a preservar es de ownership:

- shared para contratos y lógica multiplataforma
- ui para DOM compartido
- app-local para runtime/platform specifics
