import { createTheme, type Theme } from "@mui/material/styles";
import { darkPalette, lightPalette } from "./palette";
import { typography } from "./typography";

export type ThemeMode = "dark" | "light";

export function buildTheme(mode: ThemeMode): Theme {
  const palette = mode === "dark" ? darkPalette : lightPalette;

  return createTheme({
    palette,
    typography,
    shape: { borderRadius: 6 },
    shadows: Array.from({ length: 25 }, () => "none") as Theme["shadows"],
    components: {
      MuiCssBaseline: {
        styleOverrides: (themeParam) => ({
          body: {
            backgroundColor: themeParam.palette.background.default,
            color: themeParam.palette.text.primary,
          },
          "::-webkit-scrollbar": { width: 8, height: 8 },
          "::-webkit-scrollbar-track": { background: "transparent" },
          "::-webkit-scrollbar-thumb": {
            background: themeParam.palette.divider,
            borderRadius: 4,
          },
          "::-webkit-scrollbar-thumb:hover": {
            background: themeParam.palette.text.secondary,
          },
        }),
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: "none",
            border: `1px solid ${theme.palette.border.default}`,
          }),
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: "none",
            border: `1px solid ${theme.palette.border.default}`,
          }),
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "transparent" },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.border.default}`,
            color: theme.palette.text.primary,
          }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 6 },
          containedPrimary: ({ theme }) => ({
            backgroundColor: theme.palette.primary.main,
            "&:hover": { backgroundColor: theme.palette.primary.dark },
          }),
          outlined: ({ theme }) => ({
            borderColor: theme.palette.border.default,
            "&:hover": {
              borderColor: theme.palette.text.secondary,
              backgroundColor: theme.palette.action.hover,
            },
          }),
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            color: theme.palette.text.secondary,
            "&:hover": { color: theme.palette.text.primary },
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 999,
            height: 22,
            fontSize: "0.75rem",
            fontWeight: 500,
            borderColor: theme.palette.border.default,
          }),
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: ({ theme }) => ({ borderColor: theme.palette.border.muted }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: ({ theme }) => ({
            borderColor: theme.palette.border.default,
          }),
          root: ({ theme }) => ({
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.text.secondary,
            },
          }),
        },
      },
      MuiLink: {
        defaultProps: { underline: "hover" },
        styleOverrides: {
          root: ({ theme }) => ({ color: theme.palette.primary.main }),
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 6 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.border.default}`,
            fontSize: "0.75rem",
          }),
          arrow: ({ theme }) => ({ color: theme.palette.background.paper }),
        },
      },
    },
  });
}
