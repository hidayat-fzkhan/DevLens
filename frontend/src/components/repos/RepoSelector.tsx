import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import GitHubIcon from "@mui/icons-material/GitHub";
import { fetchRepos } from "../../services/api";
import type { Repo } from "../../types";

type RepoSelectorProps = Readonly<{
  analyzeLabel: string;
  onAnalyze: (repoIds: string[]) => void;
  onSelectionChange?: (repoIds: string[]) => void;
  disabled?: boolean;
}>;

export function RepoSelector({
  analyzeLabel,
  onAnalyze,
  onSelectionChange,
  disabled = false,
}: RepoSelectorProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchRepos(controller.signal)
      .then((res) => setRepos(res.repos))
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    onSelectionChange?.([...next]);
  };

  const selectedIds = [...selected];
  const canAnalyze = selectedIds.length > 0 && !disabled;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <GitHubIcon sx={{ color: "text.secondary" }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Select repositories to analyze
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading repositories…
            </Typography>
          </Stack>
        ) : repos.length === 0 ? (
          <Typography variant="body2" color="text.disabled">
            No repositories configured. Add one from the home page first.
          </Typography>
        ) : (
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {repos.map((repo) => (
              <FormControlLabel
                key={repo.id}
                control={
                  <Checkbox
                    size="small"
                    checked={selected.has(repo.id)}
                    onChange={() => toggle(repo.id)}
                    disabled={disabled}
                  />
                }
                label={
                  <Box>
                    <Typography component="span" fontWeight={500}>
                      {repo.owner}/{repo.name}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      branch: {repo.branch}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </Stack>
        )}

        <Button
          variant="contained"
          startIcon={<PlayArrowOutlinedIcon />}
          disabled={!canAnalyze}
          onClick={() => onAnalyze(selectedIds)}
        >
          {analyzeLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
