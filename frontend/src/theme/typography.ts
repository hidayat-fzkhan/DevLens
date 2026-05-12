import type { TypographyOptions } from "@mui/material/styles/createTypography";

export const SANS_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';

export const MONO_FONT_STACK =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export const typography: TypographyOptions = {
  fontFamily: SANS_FONT_STACK,
  fontSize: 14,
  htmlFontSize: 16,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  h1: { fontSize: "2rem", fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.5px" },
  h2: { fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.3px" },
  h3: { fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.3 },
  h4: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.35 },
  h5: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.4, textTransform: "none" },
  subtitle1: { fontSize: "0.9375rem", fontWeight: 500, lineHeight: 1.45 },
  subtitle2: { fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.45 },
  body1: { fontSize: "0.875rem", lineHeight: 1.5 },
  body2: { fontSize: "0.8125rem", lineHeight: 1.5 },
  button: { fontSize: "0.8125rem", fontWeight: 500, textTransform: "none", letterSpacing: 0 },
  caption: { fontSize: "0.75rem", lineHeight: 1.4, color: "inherit" },
  overline: { fontSize: "0.6875rem", letterSpacing: "0.5px", fontWeight: 600, lineHeight: 1.4 },
};
