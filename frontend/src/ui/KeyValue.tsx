import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type KeyValueProps = {
  label: ReactNode;
  children: ReactNode;
  inline?: boolean;
};

export function KeyValue({ label, children, inline = false }: KeyValueProps) {
  if (inline) {
    return (
      <Stack direction="row" spacing={1} alignItems="baseline">
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 96 }}>
          {label}
        </Typography>
        <Typography variant="body2" component="div">
          {children}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={0.25}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {children}
      </Typography>
    </Stack>
  );
}
