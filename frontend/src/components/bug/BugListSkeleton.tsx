import { Box, Skeleton, Stack } from "@mui/material";
import { Surface } from "../../ui/Surface";

type BugListSkeletonProps = Readonly<{
  rows?: number;
}>;

export function BugListSkeleton({ rows = 5 }: BugListSkeletonProps) {
  return (
    <Surface padded={false}>
      <Box>
        {Array.from({ length: rows }, (_, index) => (
          <Box
            key={index}
            sx={(theme) => ({
              display: "grid",
              gridTemplateColumns: "auto auto 1fr auto",
              gap: 2,
              alignItems: "center",
              px: 2,
              py: 1.5,
              borderBottom: `1px solid ${theme.palette.border.muted}`,
              "&:last-of-type": { borderBottom: "none" },
            })}
          >
            <Skeleton variant="rounded" width={64} height={22} />
            <Skeleton variant="text" width={72} sx={{ fontSize: "0.75rem" }} />
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Skeleton variant="text" width="65%" sx={{ fontSize: "0.9rem" }} />
              <Skeleton variant="text" width="40%" sx={{ fontSize: "0.7rem" }} />
            </Stack>
            <Skeleton
              variant="text"
              width={72}
              sx={{ fontSize: "0.75rem", display: { xs: "none", md: "block" } }}
            />
          </Box>
        ))}
      </Box>
    </Surface>
  );
}
