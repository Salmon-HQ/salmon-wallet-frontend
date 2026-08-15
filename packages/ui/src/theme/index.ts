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
  duration,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  palette,
  semantic,
  spacing,
} from '@salmon/shared';

const { accent, border, depth, state, status, surface, text } = semantic;

/** `duration` tokens are CSS strings ('200ms'); MUI wants milliseconds. */
const ms = (value: string): number => Number.parseInt(value, 10);

/**
 * The focus ring: a 2px salmon outline held off the control by a 2px gap, with
 * that gap filled by `depth.abyss` so the ring keeps its contrast on any
 * surface, light fill or dark. Never replaced by `outline: none`.
 */
const focusRing = {
  outline: `${state.focusRingWidth}px solid ${state.focusVisible}`,
  outlineOffset: `${state.focusRingOffset}px`,
  boxShadow: `0 0 0 ${state.focusRingOffset}px ${depth.abyss}`,
} as const;

/** Same ring, drawn inward — for elements clipped by a scroll container. */
const focusRingInset = {
  outline: `${state.focusRingWidth}px solid ${state.focusVisible}`,
  outlineOffset: `-${state.focusRingWidth}px`,
} as const;

/**
 * The application MUI theme. Pair with `<CssBaseline />` — the global
 * `:focus-visible` treatment and the dark canvas ship through it.
 */
export const salmonTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
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
    h6: { fontSize: fontSize.md, lineHeight: lineHeight.normal, fontWeight: fontWeight.semibold },
    subtitle1: {
      fontSize: fontSize.md,
      lineHeight: lineHeight.normal,
      fontWeight: fontWeight.medium,
    },
    subtitle2: {
      fontSize: fontSize.base,
      lineHeight: lineHeight.normal,
      fontWeight: fontWeight.medium,
    },
    body1: { fontSize: fontSize.md, lineHeight: lineHeight.normal, fontWeight: fontWeight.regular },
    body2: {
      fontSize: fontSize.base,
      lineHeight: lineHeight.normal,
      fontWeight: fontWeight.regular,
    },
    button: {
      fontSize: fontSize.actionButton,
      lineHeight: lineHeight.tight,
      fontWeight: fontWeight.semibold,
      letterSpacing: letterSpacing.normal,
      textTransform: 'none',
    },
    caption: { fontSize: fontSize.sm, lineHeight: lineHeight.normal, fontWeight: fontWeight.regular },
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
          colorScheme: 'dark',
        },
        body: {
          backgroundColor: depth.column,
          color: text.primary,
        },
        // The global ring. Attached to the bare selector so plain DOM nodes —
        // `<a>`, `<input>`, `<summary>`, anything with `tabIndex` — get it too,
        // not only MUI components. `.Mui-focusVisible` is listed alongside
        // because MUI sets that class on ButtonBase from its own focus
        // heuristics, which can fire where the CSS pseudo-class does not.
        '*:focus-visible, .Mui-focusVisible': focusRing,
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
          borderRadius: borderRadius.button,
          textTransform: 'none',
          '&.Mui-focusVisible': focusRing,
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
          '&.Mui-focusVisible': focusRing,
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
          borderRadius: borderRadius.md,
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
          '&.Mui-focusVisible': focusRing,
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
          // Menus clip their own overflow, so the offset ring would be cut.
          '&.Mui-focusVisible': focusRingInset,
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
          '&:focus-visible': focusRing,
        },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: border.strong,
          '&.Mui-checked': { color: accent.ink },
          '&.Mui-focusVisible': focusRing,
        },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: {
          color: border.strong,
          '&.Mui-checked': { color: accent.ink },
          '&.Mui-focusVisible': focusRing,
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
