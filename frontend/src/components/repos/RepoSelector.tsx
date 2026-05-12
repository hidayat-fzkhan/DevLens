import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import GitHubIcon from "@mui/icons-material/GitHub";
import { fetchRepos } from "../../services/api";
import type { Repo } from "../../types";
import { Surface } from "../../ui/Surface";

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

  const selectAll = () => {
    const all = new Set(repos.map((r) => r.id));
    setSelected(all);
    onSelectionChange?.([...all]);
  };

  const clearAll = () => {
    setSelected(new Set());
    onSelectionChange?.([]);
  };

  const selectedIds = [...selected];
  const canAnalyze = selectedIds.length > 0 && !disabled;
  const allSelected = repos.length > 0 && selectedIds.length === repos.length;

  return (
    <Surface>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <GitHubIcon sx={{ color: "text.secondary", fontSize: 18 }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Choose repositories to analyze
          </Typography>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        {loading && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={14} />
            <Typography variant="body2" color="text.secondary">
              Loading repositories…
            </Typography>
          </Stack>
        )}

        {!loading && repos.length === 0 && (
          <Typography variant="body2" color="text.disabled">
            No repositories configured.{" "}
            <Box
              component="a"
              href="/repos"
              sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              Add one →
            </Box>
          </Typography>
        )}

        {!loading && repos.length > 0 && (
          <>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {repos.map((repo) => {
                const isSelected = selected.has(repo.id);
                return (
                  <Chip
                    key={repo.id}
                    label={
                      <Box component="span">
                        <Box component="span" sx={{ fontWeight: 500 }}>
                          {repo.owner}/{repo.name}
                        </Box>
                        <Box
                          component="span"
                          sx={{ color: "text.secondary", ml: 0.75, fontSize: "0.7rem" }}
                        >
                          {repo.branch}
                        </Box>
                      </Box>
                    }
                    onClick={() => !disabled && toggle(repo.id)}
                    variant={isSelected ? "filled" : "outlined"}
                    sx={(theme) => ({
                      height: 28,
                      cursor: disabled ? "not-allowed" : "pointer",
                      borderRadius: 1,
                      borderColor: isSelected
                        ? theme.palette.primary.main
                        : theme.palette.border.default,
                      backgroundColor: isSelected
                        ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.12)
                        : "transparent",
                      color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
                      "& .MuiChip-label": { px: 1.25 },
                      "&:hover": {
                        backgroundColor: isSelected
                          ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.25 : 0.18)
                          : theme.palette.action.hover,
                      },
                    })}
                  />
                );
              })}
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Button
                variant="contained"
                startIcon={<PlayArrowOutlinedIcon />}
                disabled={!canAnalyze}
                onClick={() => onAnalyze(selectedIds)}
              >
                {analyzeLabel}
              </Button>
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {selectedIds.length} of {repos.length} selected
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={allSelected ? clearAll : selectAll}
                disabled={disabled}
              >
                {allSelected ? "Clear all" : "Select all"}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Surface>
  );
}
