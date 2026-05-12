import { Stack } from "@mui/material";
import type { ApiTicket } from "../../types";
import { BugCard } from "./BugCard";

type BugListProps = Readonly<{
  bugs: ApiTicket[];
  onOpenBug: (bugId: number) => void;
  selectedBugId?: number;
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
  analysisLoading,
  analysisError,
  promptLoading,
  promptError,
  onAnalyze,
  onGeneratePrompt,
}: BugListProps) {
  return (
    <Stack spacing={3}>
      {bugs.map((bug) => {
        const isActive = selectedBugId === bug.id && bugs.length === 1;
        return (
          <BugCard
            key={bug.id}
            bug={bug}
            isDetailed={isActive}
            onOpenBug={onOpenBug}
            analysisLoading={isActive ? analysisLoading : false}
            analysisError={isActive ? analysisError : null}
            promptLoading={isActive ? promptLoading : false}
            promptError={isActive ? promptError : null}
            onAnalyze={onAnalyze}
            onGeneratePrompt={onGeneratePrompt}
          />
        );
      })}
    </Stack>
  );
}
