import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import CommitIcon from "@mui/icons-material/Commit";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { ApiTicket } from "../../types";

type AIAnalysisProps = Readonly<{
  analysis: NonNullable<ApiTicket["aiAnalysis"]>;
}>;

type StructuredPrimitive = string | number | boolean | null;

interface StructuredArray extends Array<StructuredValue> {}

interface StructuredObject {
  [key: string]: StructuredValue;
}

type StructuredValue = StructuredPrimitive | StructuredArray | StructuredObject;

function toReadableLabel(key: string): string {
  return key
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function isStructuredObject(value: unknown): value is StructuredObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStructuredValue(value: unknown): value is StructuredValue {
  if (value == null) return true;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every((item) => isStructuredValue(item));
  if (isStructuredObject(value)) return Object.values(value).every((item) => isStructuredValue(item));
  return false;
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function tryParseStructuredSummary(summary: unknown): StructuredValue | null {
  if (isStructuredValue(summary) && typeof summary !== "string") return summary;
  if (typeof summary !== "string") return null;

  const trimmed = summary.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return isStructuredValue(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function tryExtractSummaryField(summary: unknown): string | null {
  if (typeof summary !== "string") return null;
  const match = /"summary"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(summary);
  return match ? decodeJsonString(match[1]) : null;
}

function getPlainSummaryText(summary: unknown): string {
  const extractedSummary = tryExtractSummaryField(summary);
  if (extractedSummary) return extractedSummary;
  if (typeof summary === "string") return summary;
  if (typeof summary === "number" || typeof summary === "boolean") return String(summary);
  if (summary == null) return "";
  if (Array.isArray(summary) || isStructuredObject(summary)) {
    try {
      return JSON.stringify(summary, null, 2);
    } catch {
      return "";
    }
  }
  return "";
}

function renderStructuredValue(value: StructuredValue, path: string): React.ReactNode {
  if (value == null) return null;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return (
      <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
        {String(value)}
      </Typography>
    );
  }

  if (Array.isArray(value)) {
    return (
      <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
        {value.map((item, index) => (
          <Box key={`${path}.${index}`} component="li">
            {renderStructuredValue(item, `${path}.${index}`)}
          </Box>
        ))}
      </Stack>
    );
  }

  const entries = Object.entries(value).filter(([, nestedValue]) => nestedValue != null);
  return (
    <Stack spacing={1}>
      {entries.map(([key, nestedValue]) => (
        <Box key={`${path}.${key}`}>
          <Typography variant="caption" fontWeight={600} color="text.secondary">
            {toReadableLabel(key)}
          </Typography>
          <Box sx={{ mt: 0.5 }}>{renderStructuredValue(nestedValue, `${path}.${key}`)}</Box>
        </Box>
      ))}
    </Stack>
  );
}

function AnalysisSection({
  icon,
  label,
  children,
}: Readonly<{ icon: React.ReactNode; label: string; children: React.ReactNode }>) {
  return (
    <Box
      sx={{
        borderLeft: "3px solid",
        borderColor: "divider",
        pl: 1.5,
        py: 0.25,
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
        <Box sx={{ color: "primary.main", display: "flex", alignItems: "center" }}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
          {label}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

export function AIAnalysis({ analysis }: AIAnalysisProps) {
  if (analysis.status === "not-enough-data") {
    return (
      <>
        <Divider sx={{ mt: 2 }} />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
          <PsychologyOutlinedIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>AI Analysis</Typography>
        </Stack>
        <Card variant="outlined" sx={(theme) => ({ backgroundColor: theme.palette.background.paper })}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Not enough data for AI analysis.
            </Typography>
          </CardContent>
        </Card>
      </>
    );
  }

  const isBug = analysis.analysisType === "bug";
  const structuredSummary = tryParseStructuredSummary(analysis.summary);
  const plainSummaryText = getPlainSummaryText(analysis.summary);

  return (
    <>
      <Divider sx={{ mt: 2 }} />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, mb: 0.5 }}>
        <PsychologyOutlinedIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>AI Analysis</Typography>
        {analysis.status === "ready" && (
          <Chip label="Ready" color="success" size="small" sx={{ ml: 0.5 }} />
        )}
      </Stack>

      <Card
        variant="outlined"
        sx={(theme) => ({ backgroundColor: theme.palette.background.paper })}
      >
        <CardContent>
          <Stack spacing={2}>
            <AnalysisSection
              icon={<PsychologyOutlinedIcon fontSize="small" />}
              label={isBug ? "Why Is This Bug Happening?" : "What Is This User Story Asking For?"}
            >
              {!isBug && structuredSummary ? (
                renderStructuredValue(structuredSummary, "summary")
              ) : (
                <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                  {plainSummaryText}
                </Typography>
              )}
            </AnalysisSection>

            {isBug && analysis.likelyCause && (
              <AnalysisSection
                icon={<BugReportOutlinedIcon fontSize="small" />}
                label="What Could Be The Issue?"
              >
                <Typography variant="body2">{analysis.likelyCause}</Typography>
              </AnalysisSection>
            )}

            {!isBug && analysis.implementationApproach && (
              <AnalysisSection
                icon={<LightbulbOutlinedIcon fontSize="small" />}
                label="Suggested Implementation Approach"
              >
                <Typography variant="body2">{analysis.implementationApproach}</Typography>
              </AnalysisSection>
            )}

            {!isBug && (analysis.impactedAreas?.length ?? 0) > 0 && (
              <AnalysisSection
                icon={<AccountTreeOutlinedIcon fontSize="small" />}
                label="Likely Impacted Areas"
              >
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {analysis.impactedAreas?.map((area) => (
                    <Typography key={area} variant="body2" component="li">
                      {area}
                    </Typography>
                  ))}
                </Stack>
              </AnalysisSection>
            )}

            {!isBug && (analysis.dependencies?.length ?? 0) > 0 && (
              <AnalysisSection
                icon={<AccountTreeOutlinedIcon fontSize="small" />}
                label="Dependencies / Preconditions"
              >
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {analysis.dependencies?.map((dependency) => (
                    <Typography key={dependency} variant="body2" component="li">
                      {dependency}
                    </Typography>
                  ))}
                </Stack>
              </AnalysisSection>
            )}

            {analysis.suspectCommits.length > 0 && (
              <AnalysisSection
                icon={<CommitIcon fontSize="small" />}
                label={isBug ? "Related Recent Commit(s)" : "Potentially Relevant Recent Commit(s)"}
              >
                <Stack spacing={0.5}>
                  {analysis.suspectCommits.map((commit) => (
                    <Typography key={`${commit.repo ?? ""}:${commit.sha}`} variant="body2" sx={{ fontFamily: "monospace", fontSize: 12 }}>
                      {commit.repo && (
                        <Box component="span" sx={{ mr: 1, color: "text.secondary", fontFamily: "inherit", fontSize: 12 }}>
                          [{commit.repo}]
                        </Box>
                      )}
                      {commit.url ? (
                        <Box
                          component="a"
                          href={commit.url}
                          target="_blank"
                          rel="noreferrer"
                          sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                        >
                          {commit.sha.slice(0, 8)}
                        </Box>
                      ) : (
                        commit.sha.slice(0, 8)
                      )}
                      <Box component="span" sx={{ ml: 1, fontFamily: "inherit", fontSize: 13, color: "text.secondary" }}>
                        {commit.sha.slice(8)}
                      </Box>
                    </Typography>
                  ))}
                </Stack>
              </AnalysisSection>
            )}

            {analysis.recommendations.length > 0 && (
              <AnalysisSection
                icon={<ChecklistOutlinedIcon fontSize="small" />}
                label={isBug ? "How To Fix It" : "Implementation Recommendations"}
              >
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {analysis.recommendations.map((rec) => (
                    <Typography key={rec} variant="body2" component="li">
                      {rec}
                    </Typography>
                  ))}
                </Stack>
              </AnalysisSection>
            )}

            {(analysis.importantPoints?.length ?? 0) > 0 && (
              <AnalysisSection
                icon={<InfoOutlinedIcon fontSize="small" />}
                label="Other Important Points"
              >
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {analysis.importantPoints?.map((point) => (
                    <Typography key={point} variant="body2" component="li">
                      {point}
                    </Typography>
                  ))}
                </Stack>
              </AnalysisSection>
            )}
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
