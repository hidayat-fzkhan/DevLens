import { Chip, type ChipProps } from "@mui/material";
import { alpha, useTheme, type Theme } from "@mui/material/styles";

type Tone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "bugs"
  | "stories"
  | "repos";

type PillProps = Omit<ChipProps, "color"> & {
  tone?: Tone;
};

function resolveColor(tone: Tone, theme: Theme): string {
  switch (tone) {
    case "primary": return theme.palette.primary.main;
    case "success": return theme.palette.success.main;
    case "warning": return theme.palette.warning.main;
    case "danger":  return theme.palette.error.main;
    case "info":    return theme.palette.info.main;
    case "bugs":    return theme.palette.category.bugs;
    case "stories": return theme.palette.category.stories;
    case "repos":   return theme.palette.category.repos;
    default:        return theme.palette.text.secondary;
  }
}

export function Pill({ tone = "neutral", sx, ...rest }: PillProps) {
  const theme = useTheme();
  const color = resolveColor(tone, theme);

  return (
    <Chip
      size="small"
      variant="outlined"
      sx={[
        {
          color,
          borderColor: alpha(color, 0.4),
          backgroundColor: alpha(color, theme.palette.mode === "dark" ? 0.15 : 0.1),
          "& .MuiChip-icon": { color },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
}
