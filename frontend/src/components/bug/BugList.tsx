import { Box } from "@mui/material";
import type { ApiTicket } from "../../types";
import { Surface } from "../../ui/Surface";
import { BugCard } from "./BugCard";
import { BugListSkeleton } from "./BugListSkeleton";
import { BugRow } from "./BugRow";

type BugListProps = Readonly<{
  bugs: ApiTicket[];
  onOpenBug: (bugId: number) => void;
  selectedBugId?: number;
  loading?: boolean;
  analysisLoading?: boolean;
  analysisError?: string | null;
  promptLoading?: boolean;
  promptError?: string | null;
  onAnalyze?: (ticketId: number, repoIds: string[]) => void;
  onGeneratePrompt?: (ticketId: number, repoIds: string[], guidance?: string) => void;
}>;

export function BugList({
  bugs,
  onOpenBug,
  selectedBugId,
  loading,
  analysisLoading,
  analysisError,
  promptLoading,
  promptError,
  onAnalyze,
  onGeneratePrompt,
}: BugListProps) {
  const isDetailView = selectedBugId !== undefined && bugs.length === 1;

  if (loading && bugs.length === 0) {
    return <BugListSkeleton />;
  }

  if (isDetailView) {
    const bug = bugs[0];
    return (
      <BugCard
        bug={bug}
        analysisLoading={analysisLoading}
        analysisError={analysisError}
        promptLoading={promptLoading}
        promptError={promptError}
        onAnalyze={onAnalyze}
        onGeneratePrompt={onGeneratePrompt}
      />
    );
  }

  return (
    <Surface padded={false}>
      <Box>
        {bugs.map((bug) => (
          <BugRow key={bug.id} bug={bug} onOpen={onOpenBug} />
        ))}
      </Box>
    </Surface>
  );
}
