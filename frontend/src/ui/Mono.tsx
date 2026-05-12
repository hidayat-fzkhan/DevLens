import { Box, type BoxProps } from "@mui/material";
import { MONO_FONT_STACK } from "../theme/typography";

type MonoProps = BoxProps & {
  size?: "sm" | "md";
};

export function Mono({ size = "md", sx, ...rest }: MonoProps) {
  return (
    <Box
      component="span"
      sx={[
        {
          fontFamily: MONO_FONT_STACK,
          fontSize: size === "sm" ? "0.75rem" : "0.8125rem",
          lineHeight: 1.4,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
}
