/**
 * MUI theme for Salmon Wallet — "Deep Water".
 *
 * Lives in `packages/ui` and not in `packages/shared`: `createTheme` is a DOM
 * API and `packages/shared` must stay importable from React Native.
 *
 * Every value here resolves to a token from `@salmon/shared`. Nothing in this
 * file invents a color, a size, or a duration — if a value is missing, the fix
 * is a new token, not a literal here.
 *
 * Without this theme MUI 7 runs its default *light* palette on a `#10131C`
 * canvas, so any control that is not hand-styled (Switch, Alert, Snackbar,
 * Tooltip) renders light-on-dark, and no control has a focus-visible state.
 */

import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import {
  borderRadius,
  borderWidth,
  componentSizes,
  duration,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  createSemantic,
  palette,
  semantic,
  spacing,
} from '@salmon/shared';
import type { Semantic, ThemeMode } from '@salmon/shared';

/** The dark set, for the two ring constants components import at module scope. */
const { depth, state } = semantic;

/** `duration` tokens are CSS strings ('200ms'); MUI wants milliseconds. */
const ms = (value: string): number => Number.parseInt(value, 10);

/**
 * The focus ring, drawn *inside* the control's border box.
 *
 * It used to be drawn outside — a salmon outline held off by a 2px gap filled
 * with `depth.abyss`. Two things were wrong with that. Almost every focusable
 * surface in this app sits inside a clipping ancestor (`BlurContainer`, a
 * scroll container, a sheet, `ActionButtonRow`), so anything painted outside
 * the border box was cut off; and MUI's own `ButtonBase`/`InputBase` ship
 * `outline: 0`, which quietly won against the old single-class selector and
 * left only the `box-shadow` behind — the black rectangle.
 *
 * Inset fixes both: an outline pulled inward is never clipped by an ancestor,
 * and it inherits the control's own `border-radius`, so the ring is always the
 * control's own shape. At the 12px control radius the two bands land at 10 and
 * 6 — still two legible concentric bands, which was the thing to check when
 * the controls came down off 28.
 *
 * The `depth.abyss` band beneath the salmon is a separator, not a gap filler.
 * `state.focusVisible` measures 9.29:1 on `surface.shelf` but only 1.53:1 on a
 * salmon `accent.fill` button; `depth.abyss` measures 6.50:1 on that same
 * fill. Whichever surface the ring lands on, one of the two bands clears the
 * 3:1 that WCAG 2.2 1.4.11 asks of a focus indicator.
 *
 * Never replaced by a bare `outline: none`.
 */
const focusRing = {
  outline: `${state.focusRingWidth}px solid ${state.focusVisible}`,
  outlineOffset: `-${state.focusRingWidth}px`,
  boxShadow: `inset 0 0 0 ${state.focusRingWidth + state.focusRingOffset}px ${depth.abyss}`,
} as const;

/**
 * Opt-out for a field whose visual boundary is an outer wrapper rather than
 * the input itself. Ringing the input there would draw a hard-cornered
 * rectangle inside the wrapper's rounded border — the original bug. Pair it
 * with either `focusRing` on the wrapper or a focus indicator the wrapper
 * already owns.
 */
export const focusRingNone = {
  outline: 'none',
  boxShadow: 'none',
} as const;

/** The ring, for a wrapper that owns a field's shape. See `focusRingNone`. */
export const focusRingOnWrapper = focusRing;

/**
 * The application MUI theme. Pair with `<CssBaseline />` — the global
 * `:focus-visible` treatment and the dark canvas ship through it.
 */
/**
 * Builds the MUI theme for one resolved token set.
 *
 * An adapter, not a source: every value still comes from `semantic`, only now
 * from the set the active mode resolved rather than from the module-load dark
 * one. `salmonThemeFor(mode)` memoises the result per mode — MUI's theme is an
 * identity every styled component is keyed on, so it must not be rebuilt on
 * render.
 */
export function createSalmonTheme(tokens: Semantic, mode: ThemeMode = 'dark'): Theme {
  const { accent, border, depth, state, status, surface, text } = tokens;

  const focusRing = {
    outline: `${state.focusRingWidth}px solid ${state.focusVisible}`,
    outlineOffset: `-${state.focusRingWidth}px`,
    boxShadow: `inset 0 0 0 ${state.focusRingWidth + state.focusRingOffset}px ${depth.abyss}`,
  } as const;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: accent.fill,
        light: palette.salmon[400],
        dark: palette.salmon[600],
        // The only legal text color on a salmon fill: white measures 3.06:1.
        contrastText: accent.onFill,
      },
      secondary: {
        main: palette.neutral[300],
        light: palette.neutral[200],
        dark: palette.neutral[500],
        contrastText: palette.neutral[1000],
      },
      error: {
        main: status.danger,
        dark: status.dangerFill,
        contrastText: palette.neutral[1000],
      },
      success: {
        main: status.success,
        dark: status.successFill,
        contrastText: palette.neutral[1000],
      },
      warning: {
        main: status.warning,
        dark: status.warningFill,
        contrastText: palette.neutral[1000],
      },
      background: {
        default: depth.column,
        paper: surface.shelf,
      },
      text: {
        primary: text.primary,
        secondary: text.secondary,
        disabled: text.disabled,
      },
      divider: border.default,
      action: {
        hover: state.hover,
        hoverOpacity: 0.06,
        selected: state.selectedFill,
        selectedOpacity: 0.12,
        focus: state.hover,
        focusOpacity: 0.06,
        active: text.secondary,
        activatedOpacity: 0.12,
        disabled: text.disabled,
        disabledBackground: surface.raised,
        disabledOpacity: state.disabledOpacity,
      },
    },

    shape: {
      borderRadius: borderRadius.lg,
    },

    // MUI's default unit is 8px and the repo's `styled()` layer already assumes
    // it wherever it uses `theme.spacing`. `spacing.sm` is that same 8px as a
    // token, so this is a token binding, not a rescale.
    spacing: spacing.sm,

    transitions: {
      duration: {
        shortest: ms(duration.fastest),
        shorter: ms(duration.fast),
        short: ms(duration.normal),
        standard: ms(duration.medium),
        complex: ms(duration.slow),
        enteringScreen: ms(duration.medium),
        leavingScreen: ms(duration.normal),
      },
    },

    typography: {
      fontFamily: `'${fontFamily.sans}', system-ui, -apple-system, sans-serif`,
      fontWeightLight: fontWeight.light,
      fontWeightRegular: fontWeight.regular,
      fontWeightMedium: fontWeight.medium,
      fontWeightBold: fontWeight.bold,
      h1: { fontSize: fontSize['4xl'], lineHeight: lineHeight.tight, fontWeight: fontWeight.bold },
      h2: { fontSize: fontSize['3xl'], lineHeight: lineHeight.tight, fontWeight: fontWeight.bold },
      h3: {
        fontSize: fontSize['2xl'],
        lineHeight: lineHeight.condensed,
        fontWeight: fontWeight.semibold,
        letterSpacing: letterSpacing.snug,
      },
      h4: {
        fontSize: fontSize.xl,
        lineHeight: lineHeight.condensed,
        fontWeight: fontWeight.semibold,
        letterSpacing: letterSpacing.snug,
      },
      h5: {
        fontSize: fontSize.lg,
        lineHeight: lineHeight.condensed,
        fontWeight: fontWeight.semibold,
      },
      h6: {
        fontSize: fontSize.bodyLg,
        lineHeight: lineHeight.normal,
        fontWeight: fontWeight.semibold,
      },
      subtitle1: {
        fontSize: fontSize.bodyLg,
        lineHeight: lineHeight.normal,
        fontWeight: fontWeight.medium,
      },
      subtitle2: {
        fontSize: fontSize.base,
        lineHeight: lineHeight.normal,
        fontWeight: fontWeight.medium,
      },
      body1: {
        fontSize: fontSize.bodyLg,
        lineHeight: lineHeight.normal,
        fontWeight: fontWeight.regular,
      },
      body2: {
        fontSize: fontSize.base,
        lineHeight: lineHeight.normal,
        fontWeight: fontWeight.regular,
      },
      button: {
        fontSize: fontSize.body,
        lineHeight: lineHeight.tight,
        fontWeight: fontWeight.semibold,
        letterSpacing: letterSpacing.normal,
        textTransform: 'none',
      },
      caption: {
        fontSize: fontSize.sm,
        lineHeight: lineHeight.normal,
        fontWeight: fontWeight.regular,
      },
      overline: {
        fontSize: fontSize.xs,
        lineHeight: lineHeight.normal,
        fontWeight: fontWeight.semibold,
        letterSpacing: letterSpacing.semiWide,
        textTransform: 'uppercase',
      },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            colorScheme: mode,
          },
          body: {
            backgroundColor: depth.column,
            color: text.primary,
          },
          // The global ring. Still reaches plain DOM nodes — `<a>`, `<button>`,
          // `<summary>`, anything with `tabIndex` — and `.Mui-focusVisible` is
          // listed alongside because MUI sets that class on ButtonBase from its
          // own focus heuristics, which can fire where the pseudo-class does not.
          //
          // The selectors are repeated to buy specificity 0-3-0, because MUI
          // resets both halves of the ring from its own rules and all of them
          // are injected after `CssBaseline`. `.MuiButtonBase-root` and
          // `.MuiInputBase-input` ship `outline: 0` at 0-1-0 — that is what
          // left a `ListItemButton` measuring `outline: none` with only the
          // box-shadow painting. `.MuiButton-root.MuiButton-disableElevation`
          // ships `box-shadow: none` at 0-2-0, which ate the ring's dark
          // separator band on every primary button. 0-3-0 clears both without
          // an `!important`.
          ':focus-visible:focus-visible:focus-visible, .Mui-focusVisible.Mui-focusVisible.Mui-focusVisible':
            focusRing,

          // Nodes that are structurally never a control's visual boundary, so
          // the ring must not land on them. The inner `<input>` of a MUI field
          // always sits inside something that owns the field's shape, and the
          // `<input>` inside a ButtonBase (Switch, Checkbox, Radio) is visually
          // hidden while the ButtonBase draws the control. Both are ringed by
          // the rules around this one instead.
          '.MuiInputBase-input:focus-visible:focus-visible, .MuiButtonBase-root input:focus-visible:focus-visible':
            focusRingNone,

          // A field's actual boundary. `.MuiInputBase-root` is the element that
          // carries the border, radius and fill for every self-bounded input in
          // the repo (`SeedWordInput`, the address panels, the lock screens,
          // every `TextField` via `MuiOutlinedInput`). Fields whose boundary is
          // an outer wrapper opt out with `focusRingNone` and ring the wrapper.
          '.MuiInputBase-root:has(:focus-visible):has(:focus-visible)': focusRing,
          // Pointer focus keeps no visible outline, which is only acceptable
          // because the keyboard ring above is unconditional.
          ':focus:not(:focus-visible)': {
            outline: 'none',
          },
          '@media (prefers-reduced-motion: reduce)': {
            // Motion is dropped; the ring is not. It is drawn with outline and
            // box-shadow, neither of which is animated here.
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            // MUI dark mode fakes elevation with a white overlay gradient, which
            // fights the depth ramp. Surfaces come from tokens instead.
            backgroundImage: 'none',
            backgroundColor: surface.shelf,
            color: text.primary,
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: componentSizes.buttonRadius,
            textTransform: 'none',
            '&.Mui-disabled': { opacity: state.disabledOpacity },
          },
          contained: {
            backgroundColor: accent.fill,
            color: accent.onFill,
            '&:hover': { backgroundColor: palette.salmon[600] },
          },
          outlined: {
            borderColor: border.raised,
            color: text.primary,
            '&:hover': { borderColor: border.strong, backgroundColor: state.hover },
          },
          text: {
            color: text.accent,
            '&:hover': { backgroundColor: accent.tint },
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            color: text.secondary,
            '&:hover': { backgroundColor: state.hover },
            '&.Mui-disabled': { color: text.disabled },
          },
        },
      },

      MuiTextField: {
        defaultProps: { variant: 'outlined' },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: surface.shelf,
            // The control radius, not `borderRadius.md`. A field that reads 8
            // next to a button that reads 12 is two shapes doing one job.
            borderRadius: componentSizes.inputRadius,
            color: text.primary,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: border.default,
              borderWidth: borderWidth.thin,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: border.raised },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: accent.ink,
              borderWidth: borderWidth.medium,
            },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: status.danger },
            '&.Mui-disabled': { opacity: state.disabledOpacity },
          },
          input: {
            '&::placeholder': { color: text.tertiary, opacity: 1 },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: text.secondary,
            '&.Mui-focused': { color: text.accent },
          },
        },
      },

      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            color: palette.neutral[200],
            '&.Mui-checked': { color: accent.fill },
            '&.Mui-checked + .MuiSwitch-track': { backgroundColor: accent.fill, opacity: 0.5 },
          },
          track: {
            backgroundColor: border.default,
            opacity: 1,
          },
          thumb: {
            boxShadow: 'none',
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            border: `${borderWidth.thin}px solid ${border.raised}`,
            backgroundColor: surface.raised,
            color: text.primary,
          },
          standardSuccess: { color: text.primary, '& .MuiAlert-icon': { color: status.success } },
          standardError: { color: text.primary, '& .MuiAlert-icon': { color: status.danger } },
          standardWarning: { color: text.primary, '& .MuiAlert-icon': { color: status.warning } },
          standardInfo: { color: text.primary, '& .MuiAlert-icon': { color: text.accent } },
        },
      },

      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            backgroundColor: surface.crest,
            color: text.primary,
            borderRadius: borderRadius.md,
            border: `${borderWidth.thin}px solid ${border.raised}`,
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: surface.crest,
            color: text.primary,
            border: `${borderWidth.thin}px solid ${border.raised}`,
            borderRadius: borderRadius.sm,
            fontSize: fontSize.sm,
          },
          arrow: { color: surface.crest },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: surface.crest,
            backgroundImage: 'none',
            borderRadius: borderRadius.xl,
            border: `${borderWidth.thin}px solid ${border.raised}`,
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: surface.crest,
            backgroundImage: 'none',
            border: `${borderWidth.thin}px solid ${border.raised}`,
            borderRadius: borderRadius.md,
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: text.primary,
            '&:hover': { backgroundColor: state.hover },
            '&.Mui-selected': {
              backgroundColor: state.selectedFill,
              '&:hover': { backgroundColor: accent.tintHover },
            },
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: surface.shelf,
            backgroundImage: 'none',
            borderColor: border.default,
          },
        },
      },

      MuiLink: {
        defaultProps: { underline: 'hover' },
        styleOverrides: {
          root: {
            color: text.accent,
          },
        },
      },

      MuiCheckbox: {
        styleOverrides: {
          root: {
            color: border.strong,
            '&.Mui-checked': { color: accent.ink },
          },
        },
      },

      MuiRadio: {
        styleOverrides: {
          root: {
            color: border.strong,
            '&.Mui-checked': { color: accent.ink },
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: { borderColor: border.default },
        },
      },
    },
  });
}

/** One MUI theme per mode, built on first use. */
const themeCache = new Map<ThemeMode, Theme>();

/** The memoised MUI theme for `mode`. */
export function salmonThemeFor(mode: ThemeMode): Theme {
  const hit = themeCache.get(mode);
  if (hit) {
    return hit;
  }
  const built = createSalmonTheme(createSemantic(mode), mode);
  themeCache.set(mode, built);
  return built;
}

/**
 * The dark theme, resolved at module load.
 *
 * @deprecated Mount `<SalmonThemeProvider>` instead; it supplies the theme for
 * the active mode. This export stays for consumers not yet inside the provider
 * and is byte-for-byte what it always was — it is `salmonThemeFor('dark')`.
 */
export const salmonTheme: Theme = salmonThemeFor('dark');
