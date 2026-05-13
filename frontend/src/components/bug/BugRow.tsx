import { Box, Stack, Typography } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import UpdateOutlinedIcon from "@mui/icons-material/UpdateOutlined";
import type { ApiTicket } from "../../types";
import { formatDate } from "../../utils/formatters";
import { Mono } from "../../ui/Mono";
import { Pill } from "../../ui/Pill";

type BugRowProps = Readonly<{
  bug: ApiTicket;
  onOpen: (id: number) => void;
}>;

type StateTone = "success" | "primary" | "info" | "neutral";

function getStateTone(state?: string): StateTone {
  const s = state?.toLowerCase() ?? "";
  if (s === "new") return "success";
  if (s === "active" || s === "in progress") return "primary";
  if (s === "resolved" || s === "done") return "info";
  return "neutral";
}

export function BugRow({ bug, onOpen }: BugRowProps) {
  return (
    <Box
      onClick={() => onOpen(bug.id)}
      sx={(theme) => ({
        display: "grid",
        gridTemplateColumns: "auto auto auto 1fr auto",
        gap: 2,
        alignItems: "center",
        px: 2,
        py: 1.25,
        cursor: "pointer",
        borderBottom: `1px solid ${theme.palette.border.muted}`,
        transition: "background-color 0.15s",
        "&:hover": { backgroundColor: theme.palette.action.hover },
        "&:last-of-type": { borderBottom: "none" },
      })}
    >
      <Pill
        label={bug.state ?? "—"}
        tone={getStateTone(bug.state)}
        sx={{ minWidth: 64, justifyContent: "center" }}
      />

      {bug.priority !== undefined ? (
        <Mono size="sm" sx={{ color: "text.secondary", minWidth: 28 }}>
          P{bug.priority}
        </Mono>
      ) : (
        <Box sx={{ minWidth: 28 }} />
      )}

      <Mono size="sm" sx={{ color: "text.secondary" }}>
        #{bug.id}
      </Mono>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {bug.title}
        </Typography>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ mt: 0.25, color: "text.disabled", flexWrap: "wrap" }}
        >
          {bug.assignedTo && (
            <RowMeta icon={<PersonOutlineIcon sx={{ fontSize: 12 }} />} text={bug.assignedTo} />
          )}
          {bug.changedDate && (
            <RowMeta
              icon={<UpdateOutlinedIcon sx={{ fontSize: 12 }} />}
              text={formatDate(bug.changedDate)}
            />
          )}
          {bug.areaPath && (
            <RowMeta
              icon={<FolderOutlinedIcon sx={{ fontSize: 12 }} />}
              text={bug.areaPath}
            />
          )}
        </Stack>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ color: "text.disabled", whiteSpace: "nowrap", display: { xs: "none", md: "flex" } }}
      >
        {bug.storyPoints !== undefined && (
          <Mono size="sm" sx={{ color: "text.secondary" }}>
            {bug.storyPoints} pts
          </Mono>
        )}
        <Typography variant="caption">{bug.workItemType}</Typography>
      </Stack>
    </Box>
  );
}

function RowMeta({ icon, text }: Readonly<{ icon: React.ReactNode; text: string }>) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
      {icon}
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 240,
        }}
      >
        {text}
      </Typography>
    </Stack>
  );
}
