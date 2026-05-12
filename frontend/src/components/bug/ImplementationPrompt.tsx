import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { Surface } from "../../ui/Surface";
import { MONO_FONT_STACK } from "../../theme/typography";
import { ErrorMessage } from "../common/ErrorMessage";

type ImplementationPromptProps = Readonly<{
  prompt?: string;
  loading: boolean;
  error?: string | null;
  onGenerate: (guidance?: string) => void;
}>;

export function ImplementationPrompt({
  prompt,
  loading,
  error,
  onGenerate,
}: ImplementationPromptProps) {
  const [copied, setCopied] = useState(false);
  const [guidance, setGuidance] = useState("");

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Surface>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoFixHighOutlinedIcon sx={{ color: "primary.main", fontSize: 18 }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Implementation Prompt
          </Typography>
        </Stack>

        {!prompt && !loading && !error && (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Generate a ready-to-paste prompt for your AI coding assistant, tailored to this user story.
            </Typography>
            <TextField
              label="Additional guidance (optional)"
              placeholder="e.g. focus on the frontend only, use React hooks, avoid touching the auth module…"
              multiline
              minRows={2}
              maxRows={5}
              size="small"
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
            />
            <Button
              variant="contained"
              startIcon={<AutoFixHighOutlinedIcon />}
              sx={{ alignSelf: "flex-start" }}
              onClick={() => onGenerate(guidance.trim() || undefined)}
            >
              Generate Prompt
            </Button>
          </Stack>
        )}

        {loading && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
            <CircularProgress size={16} thickness={4} />
            <Typography variant="body2" color="text.secondary">
              Generating implementation prompt…
            </Typography>
          </Stack>
        )}

        {error && !loading && <ErrorMessage message={error} />}

        {prompt && !loading && (
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant={copied ? "contained" : "outlined"}
                color={copied ? "success" : "primary"}
                startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                onClick={() => void handleCopy()}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </Stack>
            <Box
              sx={(theme) => ({
                border: `1px solid ${theme.palette.border.muted}`,
                borderRadius: 1,
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? theme.palette.background.default
                    : theme.palette.background.paper,
                p: 1.5,
                maxHeight: 480,
                overflow: "auto",
              })}
            >
              <Typography
                component="pre"
                sx={(theme) => ({
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: MONO_FONT_STACK,
                  fontSize: "0.78rem",
                  lineHeight: 1.6,
                  m: 0,
                  color: theme.palette.text.primary,
                })}
              >
                {prompt}
              </Typography>
            </Box>
          </Stack>
        )}
      </Stack>
    </Surface>
  );
}
