import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type SectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function Section({ title, description, actions, children }: SectionProps) {
  return (
    <Stack spacing={1.5}>
      {(title || actions) && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Box>
            {title && (
              <Typography variant="h4" fontWeight={600}>
                {title}
              </Typography>
            )}
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {description}
              </Typography>
            )}
          </Box>
          {actions}
        </Stack>
      )}
      {children}
    </Stack>
  );
}
