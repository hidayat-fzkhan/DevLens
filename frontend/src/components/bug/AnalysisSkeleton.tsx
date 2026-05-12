import { Box, Skeleton, Stack } from "@mui/material";

export function AnalysisSkeleton() {
  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.palette.border.default}`,
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
        p: 2.5,
      })}
    >
      <Stack spacing={2.5}>
        {[1, 2, 3].map((id) => (
          <Box
            key={id}
            sx={(theme) => ({
              borderLeft: `3px solid ${theme.palette.border.default}`,
              pl: 1.5,
            })}
          >
            <Skeleton variant="text" width={140} sx={{ fontSize: "0.85rem", mb: 0.75 }} />
            <Skeleton variant="text" width="92%" />
            <Skeleton variant="text" width="78%" />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
