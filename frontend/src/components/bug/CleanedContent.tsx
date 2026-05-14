import {
  Box,
  CircularProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { ApiCleanupResult } from "../../types";
import { ErrorMessage } from "../common/ErrorMessage";

type CleanedContentProps = Readonly<{
  cleanup: ApiCleanupResult | null;
  loading: boolean;
  error: string | null;
  isBug: boolean;
}>;

export function CleanedContent({ cleanup, loading, error, isBug }: CleanedContentProps) {
  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.palette.border.default}`,
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
        p: { xs: 2, sm: 2.5 },
        minHeight: 240,
        minWidth: 0,
        overflowWrap: "anywhere",
        "& .MuiTypography-root": { overflowWrap: "anywhere" },
      })}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <AutoAwesomeOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
        <Typography variant="h4" fontWeight={600}>
          Cleaned-up content
        </Typography>
        {loading && <CircularProgress size={14} sx={{ ml: 0.5 }} />}
      </Stack>

      {!loading && !error && !cleanup && (
        <Typography variant="body2" color="text.disabled">
          AI will refine the ticket content into a clean restatement here.
        </Typography>
      )}

      {error && !loading && <ErrorMessage message={error} />}

      {loading && !cleanup && (
        <Stack spacing={1.5}>
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="92%" />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="88%" sx={{ mt: 1 }} />
          <Skeleton variant="text" width="72%" />
        </Stack>
      )}

      {cleanup?.status === "not-enough-data" && (
        <Typography variant="body2" color="text.secondary">
          Not enough content in the ticket to refine.
        </Typography>
      )}

      {cleanup?.status === "ready" && (
        <Stack spacing={2}>
          <CleanedSection label="Summary" prominent>
            <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
              {cleanup.summary}
            </Typography>
          </CleanedSection>

          {cleanup.problem && (
            <CleanedSection label={isBug ? "Problem" : "What the user wants"}>
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {cleanup.problem}
              </Typography>
            </CleanedSection>
          )}

          {isBug && cleanup.expectedBehavior && (
            <CleanedSection label="Expected behavior">
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {cleanup.expectedBehavior}
              </Typography>
            </CleanedSection>
          )}

          {isBug && cleanup.currentBehavior && (
            <CleanedSection label="Current behavior">
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {cleanup.currentBehavior}
              </Typography>
            </CleanedSection>
          )}

          {isBug && cleanup.reproSteps && cleanup.reproSteps.length > 0 && (
            <CleanedSection label="Repro steps">
              <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                {cleanup.reproSteps.map((step, idx) => (
                  <Typography component="li" variant="body2" key={idx}>
                    {step}
                  </Typography>
                ))}
              </Stack>
            </CleanedSection>
          )}

          {!isBug && cleanup.acceptanceCriteria && cleanup.acceptanceCriteria.length > 0 && (
            <CleanedSection label="Acceptance criteria">
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                {cleanup.acceptanceCriteria.map((c, idx) => (
                  <Typography component="li" variant="body2" key={idx}>
                    {c}
                  </Typography>
                ))}
              </Stack>
            </CleanedSection>
          )}

          {cleanup.nonFunctional && cleanup.nonFunctional.length > 0 && (
            <CleanedSection label="Non-functional / APIs">
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                {cleanup.nonFunctional.map((nf, idx) => (
                  <Typography component="li" variant="body2" key={idx}>
                    {nf}
                  </Typography>
                ))}
              </Stack>
            </CleanedSection>
          )}

          {cleanup.openQuestions && cleanup.openQuestions.length > 0 && (
            <CleanedSection
              label="Open questions"
              icon={<HelpOutlineIcon sx={{ fontSize: 14 }} />}
            >
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                {cleanup.openQuestions.map((q, idx) => (
                  <Typography
                    component="li"
                    variant="body2"
                    color="text.secondary"
                    key={idx}
                  >
                    {q}
                  </Typography>
                ))}
              </Stack>
            </CleanedSection>
          )}
        </Stack>
      )}
    </Box>
  );
}

type CleanedSectionProps = Readonly<{
  label: string;
  prominent?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}>;

function CleanedSection({ label, prominent = false, icon, children }: CleanedSectionProps) {
  return (
    <Box
      sx={(theme) => ({
        borderLeft: prominent
          ? `3px solid ${theme.palette.primary.main}`
          : `3px solid ${theme.palette.border.default}`,
        pl: 1.5,
      })}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
        {icon && <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>}
        <Typography
          variant="overline"
          color={prominent ? "primary.main" : "text.secondary"}
          sx={{ fontWeight: 700 }}
        >
          {label}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}
