import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import LoopIcon from "@mui/icons-material/Loop";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import UpdateOutlinedIcon from "@mui/icons-material/UpdateOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import type { ApiTicket } from "../../types";
import { formatDate } from "../../utils/formatters";

type BugDetailsProps = Readonly<{
  bug: ApiTicket;
  isDetailed?: boolean;
}>;

function MetaItem({ icon, text }: Readonly<{ icon: React.ReactNode; text: string }>) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box sx={{ color: "text.disabled", display: "flex", alignItems: "center" }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Stack>
  );
}

function getStateColor(state: string): "primary" | "success" | "secondary" | "default" {
  const s = state.toLowerCase();
  if (s === "active" || s === "in progress") return "primary";
  if (s === "new") return "success";
  if (s === "resolved" || s === "done") return "secondary";
  return "default";
}

function SectionHeading({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Typography
      variant="subtitle2"
      fontWeight={600}
      sx={{ color: "text.primary", mt: 0.5 }}
    >
      {children}
    </Typography>
  );
}

export function BugDetails({ bug, isDetailed = false }: BugDetailsProps) {
  const isBug = bug.category === "bugs";

  return (
    <>
      <Stack spacing={0.75}>
        <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1.3 }}>
          {bug.title}
        </Typography>

        <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
          <Chip size="small" label={`#${bug.id}`} variant="outlined" sx={{ fontWeight: 600 }} />
          <Chip size="small" label={bug.workItemType} />
          {bug.state && (
            <Chip size="small" label={bug.state} color={getStateColor(bug.state)} />
          )}
          {bug.priority !== undefined && (
            <Chip
              size="small"
              variant="outlined"
              label={`P${bug.priority}`}
              sx={{ fontWeight: 600 }}
            />
          )}
          {bug.severity && (
            <Chip size="small" variant="outlined" label={`Sev: ${bug.severity}`} />
          )}
          {bug.storyPoints !== undefined && (
            <Chip
              size="small"
              variant="outlined"
              label={`${bug.storyPoints} pts`}
              sx={{ fontWeight: 600 }}
            />
          )}
        </Stack>
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 0.5 }}>
        {bug.assignedTo && (
          <MetaItem
            icon={<PersonOutlineIcon sx={{ fontSize: 14 }} />}
            text={`Assigned: ${bug.assignedTo}`}
          />
        )}
        {bug.createdBy && (
          <MetaItem
            icon={<PersonOutlineIcon sx={{ fontSize: 14 }} />}
            text={`Reported by: ${bug.createdBy}`}
          />
        )}
        {bug.createdDate && (
          <MetaItem
            icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 14 }} />}
            text={`Created: ${formatDate(bug.createdDate)}`}
          />
        )}
        {bug.changedDate && (
          <MetaItem
            icon={<UpdateOutlinedIcon sx={{ fontSize: 14 }} />}
            text={`Last update: ${formatDate(bug.changedDate)}${bug.changedBy ? ` · ${bug.changedBy}` : ""}`}
          />
        )}
        {bug.areaPath && (
          <MetaItem
            icon={<FolderOutlinedIcon sx={{ fontSize: 14 }} />}
            text={bug.areaPath}
          />
        )}
        {bug.iterationPath && (
          <MetaItem
            icon={<LoopIcon sx={{ fontSize: 14 }} />}
            text={bug.iterationPath}
          />
        )}
      </Stack>

      {(bug.resolvedDate || bug.resolvedBy || bug.resolvedReason) && (
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          flexWrap="wrap"
          sx={(theme) => ({
            mt: 0.5,
            px: 1.25,
            py: 0.5,
            borderRadius: 1,
            border: `1px solid ${theme.palette.border.muted}`,
            backgroundColor: theme.palette.background.paper,
            color: "text.secondary",
          })}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 14, color: "success.main" }} />
          <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 600 }}>
            Resolved
          </Typography>
          {bug.resolvedReason && (
            <Typography variant="caption">· {bug.resolvedReason}</Typography>
          )}
          {bug.resolvedBy && (
            <Typography variant="caption">· by {bug.resolvedBy}</Typography>
          )}
          {bug.resolvedDate && (
            <Typography variant="caption">· {formatDate(bug.resolvedDate)}</Typography>
          )}
        </Stack>
      )}

      {bug.tags && (
        <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
          <LocalOfferOutlinedIcon sx={{ fontSize: 14, color: "text.disabled" }} />
          {bug.tags.split(/[;,]/).map((tag) =>
            tag.trim() ? (
              <Chip key={tag.trim()} label={tag.trim()} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            ) : null
          )}
        </Stack>
      )}

      {bug.webUrl && (
        <Box>
          <Typography
            component="a"
            href={bug.webUrl}
            target="_blank"
            rel="noreferrer"
            variant="body2"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              color: "primary.main",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Open in Azure DevOps
            <OpenInNewIcon sx={{ fontSize: 13 }} />
          </Typography>
        </Box>
      )}

      {bug.summary && !isDetailed && (
        <Box>
          <SectionHeading>Summary</SectionHeading>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line", mt: 0.5 }}>
            {bug.summary}
          </Typography>
        </Box>
      )}

      {isDetailed && bug.description && (
        <Box>
          <Divider sx={{ my: 1.5 }} />
          <SectionHeading>{isBug ? "Bug Description" : "User Story Description"}</SectionHeading>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 0.5 }}>
            {bug.description}
          </Typography>
        </Box>
      )}

      {isDetailed && isBug && bug.reproSteps && (
        <Box>
          <Divider sx={{ my: 1.5 }} />
          <SectionHeading>Repro Steps / Additional Details</SectionHeading>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 0.5 }}>
            {bug.reproSteps}
          </Typography>
        </Box>
      )}

      {isDetailed && !isBug && bug.acceptanceCriteria && (
        <Box>
          <Divider sx={{ my: 1.5 }} />
          <SectionHeading>Acceptance Criteria</SectionHeading>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 0.5 }}>
            {bug.acceptanceCriteria}
          </Typography>
        </Box>
      )}

      {isDetailed && bug.nonFunctionalRequirements && (
        <Box>
          <Divider sx={{ my: 1.5 }} />
          <SectionHeading>Non-Functional Requirements</SectionHeading>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 0.5 }}>
            {bug.nonFunctionalRequirements}
          </Typography>
        </Box>
      )}
    </>
  );
}
