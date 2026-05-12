import { Box, type BoxProps } from "@mui/material";

type SurfaceProps = BoxProps & {
  padded?: boolean;
};

export function Surface({ padded = true, sx, children, ...rest }: SurfaceProps) {
  return (
    <Box
      sx={[
        (theme) => ({
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.default}`,
          borderRadius: 1,
          padding: padded ? 2 : 0,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {children}
    </Box>
  );
}
