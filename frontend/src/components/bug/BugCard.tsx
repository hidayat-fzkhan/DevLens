import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useState } from "react";
import type { ApiTicket } from "../../types";
import { AIAnalysis } from "./AIAnalysis";
import { BugDetails } from "./BugDetails";
import { ImplementationPrompt } from "./ImplementationPrompt";
import { ErrorMessage } from "../common/ErrorMessage";
import { RepoSelector } from "../repos/RepoSelector";

type BugCardProps = Readonly<{
  bug: ApiTicket;
  isDetailed?: boolean;
  onOpenBug: (bugId: number) => void;
  analysisLoading?: boolean;
  analysisError?: string | null;
  promptLoading?: boolean;
  promptError?: string | null;
  onAnalyze?: (ticketId: number, repoIds: string[]) => void;
  onGeneratePrompt?: (ticketId: number, repoIds: string[], guidance?: string) => void;
}>;

function getStateTone(state?: string): "active" | "new" | "resolved" | "closed" {
  const s = state?.toLowerCase() ?? "";
  if (s === "new") return "new";
  if (s === "resolved" || s === "done") return "resolved";
  if (s === "closed" || s === "removed") return "closed";
  return "active";
}

export function BugCard({
  bug,
  isDetailed = false,
  onOpenBug,
  analysisLoading = false,
  analysisError = null,
  promptLoading = false,
  promptError = null,
  onAnalyze,
  onGeneratePrompt,
}: BugCardProps) {
  const isBug = bug.category === "bugs";
  const showImplementationPrompt =
    isDetailed && !isBug && bug.aiAnalysis?.status === "ready";
  const stateTone = getStateTone(bug.state);
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
  const showRepoSelector =
    isDetailed && !bug.aiAnalysis && !analysisLoading && !analysisError;

  return (
    <Card
      sx={(theme) => ({
        borderLeft: `4px solid ${theme.palette.state[stateTone]}`,
        transition: "border-color 0.15s, background-color 0.15s",
        ...(isDetailed
          ? {}
          : { "&:hover": { borderColor: theme.palette.text.secondary } }),
      })}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <BugDetails bug={bug} isDetailed={isDetailed} />

          {!isDetailed && (
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
              <Button
                variant="contained"
                size="small"
                endIcon={<OpenInNewIcon fontSize="small" />}
                onClick={() => onOpenBug(bug.id)}
              >
                {isBug ? "Analyze Bug" : "Analyze Story"}
              </Button>
            </Box>
          )}

          {showRepoSelector && (
            <RepoSelector
              analyzeLabel={isBug ? "Analyze Bug" : "Analyze Story"}
              onSelectionChange={setSelectedRepoIds}
              onAnalyze={(repoIds) => {
                setSelectedRepoIds(repoIds);
                onAnalyze?.(bug.id, repoIds);
              }}
              disabled={analysisLoading}
            />
          )}

          {isDetailed && analysisLoading && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
              <CircularProgress size={18} thickness={4} />
              <Typography variant="body2" color="text.secondary">
                {isBug
                  ? "AI is analyzing this bug and repository context…"
                  : "AI is analyzing this user story and repository context…"}
              </Typography>
            </Stack>
          )}

          {isDetailed && analysisError && (
            <ErrorMessage message={analysisError} />
          )}

          {isDetailed && bug.aiAnalysis && (
            <AIAnalysis analysis={bug.aiAnalysis} />
          )}

          {showImplementationPrompt && (
            <ImplementationPrompt
              prompt={bug.implementationPrompt}
              loading={promptLoading}
              error={promptError}
              onGenerate={(guidance) =>
                onGeneratePrompt?.(bug.id, selectedRepoIds, guidance)
              }
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
