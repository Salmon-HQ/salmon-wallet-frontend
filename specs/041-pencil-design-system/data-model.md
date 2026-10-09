# Data model: Salmon Wallet design system in Pencil

The "data" of this feature is design files and the reports that tie them to
code. Each entity below says where it lives, its fields, and the rule that
validates it.

## Token (Pencil variable)

Lives in `Salmon.lib.pen` → `variables`; mirrored by `tokens.manifest.json`.

| Field   | Rule                                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`  | Token path with dots: `semantic.surface.shelf`, `palette.salmon.500`, `spacing.lg`, `typography.body.size`. Equals the `--sw-*` path for semantic tokens. |
| `type`  | `color` · `number` · `string`                                                                                                                             |
| `value` | Either one value (invariant) or `[{value, theme:{mode:"dark"}}, {value, theme:{mode:"light"}}]`. Both modes present whenever the code differs by mode.    |
| alias   | `"$palette.…"` when the code value equals a palette step in that mode; otherwise a literal. Colour literals are `#RRGGBB` or `#RRGGBBAA`.                 |

Validation: every leaf in the manifest exists as a variable with the same
name, type and per-mode value (SC-002).

## Token manifest (`tokens.manifest.json`)

Output of the token exporter; input to `SetVariables` and to the coverage check.

```json
{
  "baseline": {
    "main": "31cd6541…",
    "inFlight": [{ "branch": "feat/seeker-seed-vault", "commit": "d016740e" }]
  },
  "tokens": [
    {
      "name": "semantic.surface.shelf",
      "type": "color",
      "dark": "$palette.neutral.950",
      "light": "$palette.neutral.0",
      "source": "packages/shared/src/theme/semantic.ts"
    },
    {
      "name": "semantic.surface.scrim",
      "type": "color",
      "dark": "#0B0F197A",
      "light": "#…",
      "alphaOf": "palette.neutral.1000"
    }
  ]
}
```

## Component

Lives in `Salmon.lib.pen` as a `reusable: true` frame.

| Field     | Rule                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------- |
| `name`    | `Group/Variant` (`Button/Primary`); a component without variants is `Group/Default`.                 |
| class     | `primitive` · `composite` · `material` (from the inventory)                                          |
| platform  | `both` · `mobile-only` · `extension-only`                                                            |
| code      | Paths of the twin implementations and the `XPropsBase` contract.                                     |
| slots     | Named empty frames with `slot: []` where the code takes children.                                    |
| `context` | Short note: code paths, size tokens for width/height (R3), the material label (FR-012), motion note. |

Validation: auto layout everywhere except listed overlays; lint reports zero
unbound values; composites contain only `ref`s to library components plus
text/icons.

## Inventory row (`inventory.csv`)

`component, ui_path, mobile_path, contract, class, platform, in_key_flows, jev_confidence, reviewed_by, drawn_as`

`drawn_as`: the `Group/Variant` names, `template:<name>`, `screen`, or `not-drawn:<reason>`.

## Layout template

Lives in `Salmon Screens.pen`, as a component of the screens file.

| Template                             | Outer size                                                   | Slots                    |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------ |
| `Template/Mobile Screen`             | 390×844, safe-area insets as padding                         | header, content, actions |
| `Template/Mobile Sheet`              | width 390, `fit_content` height                              | title, content, actions  |
| `Template/Extension Side Panel`      | measured default width × measured height, `panelTop` padding | header, content, actions |
| `Template/Extension Approval Window` | measured window size                                         | header, content, actions |
| `Template/Extension Sheet`           | measured dialog size                                         | title, content, actions  |

Validation: outer size and insets within 1px of the runtime measurement.

## Flow board

A top-level frame in `Salmon Screens.pen`: `Flow/<Flow>/<NN State>`
(`Flow/Send/03 Review`), an instance of a template with library instances in
its slots. Mobile in full; extension boards only for container deltas
(clarification FR-010). Branch-sourced boards add `· <branch>` to the name and
a label. Theme switched on the board with the library's namespaced axis.

## Runtime measurement (`measurements/<platform>/<flow>/<state>.json`)

```json
{
  "platform": "extension",
  "surface": "side-panel",
  "flow": "send",
  "state": "review",
  "commit": "d016740e",
  "viewport": { "w": 400, "h": 800 },
  "capturedAt": "2026-10-…",
  "screenshot": "send-review.png",
  "elements": [
    {
      "testId": "send-review-amount",
      "component": "AmountEntryCard",
      "box": { "x": 12, "y": 96, "w": 376, "h": 120 },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px 16px",
        "margin": "0px 0px 12px",
        "position": "static"
      },
      "flags": ["margin-between-siblings"]
    }
  ]
}
```

Mobile files carry `box` and `testId` only (no `style`).

## Finding (`Findings.md`, one row per finding)

| Field    | Rule                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`     | `F-<NNN>`                                                                                                                                        |
| kind     | `margin-for-gap` · `fixed-size-for-fill` · `absolute-for-flow` · `literal-for-token` · `legacy-token` · `twin-divergence` · `design-md-mismatch` |
| where    | Component or `Flow/State`, platform                                                                                                              |
| code     | `path:line` at the baseline commit                                                                                                               |
| measured | Runtime value (from a measurement file)                                                                                                          |
| drawn    | The structure in Pencil (node name)                                                                                                              |
| fix      | One-sentence suggested change                                                                                                                    |
| severity | `high` (visible misalignment or breaks at another size/locale) · `medium` (fragile, renders right) · `low` (naming/legacy)                       |

Validation: three random findings reproduce from the row alone (SC-005).
