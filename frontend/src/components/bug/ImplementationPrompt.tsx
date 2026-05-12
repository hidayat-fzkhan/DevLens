import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
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
    <>
      <Divider sx={{ mt: 2 }} />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
        <AutoFixHighOutlinedIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Prompt to Implement
        </Typography>
      </Stack>

      {!prompt && !loading && !error && (
        <Stack spacing={1.5}>
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
            color="primary"
            startIcon={<AutoFixHighOutlinedIcon />}
            sx={{ alignSelf: "flex-start" }}
            onClick={() => onGenerate(guidance.trim() || undefined)}
          >
            Generate Implementation Prompt
          </Button>
        </Stack>
      )}

      {loading && (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={18} thickness={4} />
          <Typography variant="body2" color="text.secondary">
            Generating implementation prompt…
          </Typography>
        </Stack>
      )}

      {error && !loading && <ErrorMessage message={error} />}

      {prompt && !loading && (
        <Card
          variant="outlined"
          sx={(theme) => ({
            backgroundColor: theme.palette.background.paper,
            borderColor: theme.palette.primary.main,
          })}
        >
          <CardContent>
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  variant={copied ? "contained" : "outlined"}
                  color={copied ? "success" : "primary"}
                  startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                  onClick={() => void handleCopy()}
                >
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
              </Box>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "'Fira Mono', 'Cascadia Code', 'Consolas', monospace",
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  m: 0,
                  color: "text.primary",
                }}
              >
                {prompt}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}
    </>
  );
}
