import { Box, Card, CardContent, Stack } from "@mui/material";
import { useState } from "react";
import type { ApiTicket } from "../../types";
import { AIAnalysis } from "./AIAnalysis";
import { AnalysisSkeleton } from "./AnalysisSkeleton";
import { BugDetails } from "./BugDetails";
import { ImplementationPrompt } from "./ImplementationPrompt";
import { ErrorMessage } from "../common/ErrorMessage";
import { RepoSelector } from "../repos/RepoSelector";

type BugCardProps = Readonly<{
  bug: ApiTicket;
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
  analysisLoading = false,
  analysisError = null,
  promptLoading = false,
  promptError = null,
  onAnalyze,
  onGeneratePrompt,
}: BugCardProps) {
  const isBug = bug.category === "bugs";
  const stateTone = getStateTone(bug.state);
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);

  const showRepoSelector = !bug.aiAnalysis && !analysisLoading && !analysisError;
  const showImplementationPrompt = !isBug && bug.aiAnalysis?.status === "ready";
  const analysisPaneHasContent =
    analysisLoading || analysisError || bug.aiAnalysis || showRepoSelector;

  return (
    <Card
      sx={(theme) => ({
        borderLeft: `4px solid ${theme.palette.state[stateTone]}`,
      })}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 5fr) minmax(0, 4fr)" },
            gap: { xs: 3, lg: 4 },
            alignItems: "start",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack spacing={2}>
              <BugDetails bug={bug} isDetailed />
            </Stack>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            {analysisPaneHasContent ? (
              <Stack spacing={2}>
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

                {analysisLoading && <AnalysisSkeleton />}

                {analysisError && <ErrorMessage message={analysisError} />}

                {bug.aiAnalysis && <AIAnalysis analysis={bug.aiAnalysis} />}

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
            ) : null}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
