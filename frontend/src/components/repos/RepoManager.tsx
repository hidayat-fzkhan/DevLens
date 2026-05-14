import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import GitHubIcon from "@mui/icons-material/GitHub";
import {
  addRepo,
  deleteRepo,
  fetchRepos,
  updateRepoMetadata,
} from "../../services/api";
import type { Repo } from "../../types";
import { useToast } from "../common/ToastProvider";

export function RepoManager() {
  const { showToast } = useToast();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [language, setLanguage] = useState("");
  const [framework, setFramework] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLanguage, setEditLanguage] = useState("");
  const [editFramework, setEditFramework] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchRepos(signal);
      setRepos(res.repos);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const resetForm = () => {
    setUrl("");
    setBranch("main");
    setLanguage("");
    setFramework("");
    setSubmitError(null);
  };

  const handleAdd = async () => {
    if (!url.trim() || !branch.trim()) {
      setSubmitError("URL and branch are required.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await addRepo({
        url: url.trim(),
        branch: branch.trim(),
        language: language.trim() || undefined,
        framework: framework.trim() || undefined,
      });
      setRepos((prev) => [...prev, res.repo]);
      resetForm();
      setFormOpen(false);
      showToast(`Added ${res.repo.owner}/${res.repo.name}`, "success");
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = repos.find((r) => r.id === id);
    setDeletingId(id);
    try {
      await deleteRepo(id);
      setRepos((prev) => prev.filter((r) => r.id !== id));
      if (target) {
        showToast(`Removed ${target.owner}/${target.name}`, "info");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const beginEdit = (repo: Repo) => {
    setEditingId(repo.id);
    setEditLanguage(repo.language ?? "");
    setEditFramework(repo.framework ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLanguage("");
    setEditFramework("");
  };

  const handleSaveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const res = await updateRepoMetadata(id, {
        language: editLanguage.trim() ? editLanguage.trim() : null,
        framework: editFramework.trim() ? editFramework.trim() : null,
      });
      setRepos((prev) => prev.map((r) => (r.id === id ? res.repo : r)));
      cancelEdit();
      showToast("Repository updated", "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <GitHubIcon sx={{ color: "text.secondary" }} />
            <Typography variant="h6" fontWeight={600}>
              GitHub Repositories
            </Typography>
            <Chip
              label={repos.length}
              size="small"
              sx={{ ml: 0.5 }}
              color={repos.length > 0 ? "primary" : "default"}
            />
          </Stack>
          {!formOpen && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setFormOpen(true)}
            >
              Add Repository
            </Button>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These repositories provide commit history and code context for AI
          analysis. Add the language / framework so the AI frames suggestions in
          the right stack idioms.
        </Typography>

        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLoadError(null)}>
            {loadError}
          </Alert>
        )}

        {formOpen && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              backgroundColor: "action.hover",
            }}
          >
            <Stack spacing={1.5}>
              <TextField
                label="Repository URL or owner/repo"
                placeholder="https://github.com/owner/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                size="small"
                fullWidth
                autoFocus
                disabled={submitting}
              />
              <TextField
                label="Branch"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                size="small"
                fullWidth
                disabled={submitting}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  label="Language (optional)"
                  placeholder="TypeScript, Python, Java…"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  size="small"
                  fullWidth
                  disabled={submitting}
                />
                <TextField
                  label="Framework (optional)"
                  placeholder="Express, Spring Boot, React…"
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  size="small"
                  fullWidth
                  disabled={submitting}
                />
              </Stack>
              {submitError && <Alert severity="error">{submitError}</Alert>}
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  size="small"
                  onClick={() => {
                    resetForm();
                    setFormOpen(false);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleAdd}
                  disabled={submitting}
                  startIcon={
                    submitting ? <CircularProgress size={14} /> : <AddIcon />
                  }
                >
                  Add
                </Button>
              </Stack>
            </Stack>
          </Box>
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
            No repositories configured yet. Add one to enable AI analysis.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {repos.map((repo) => {
              const isEditing = editingId === repo.id;
              const isSaving = savingId === repo.id;
              return (
                <Box
                  key={repo.id}
                  sx={{
                    p: 1.25,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={1}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Link
                        href={`https://github.com/${repo.owner}/${repo.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ fontWeight: 600, display: "block" }}
                      >
                        {repo.owner}/{repo.name}
                      </Link>
                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        gap={0.5}
                        alignItems="center"
                        sx={{ mt: 0.25 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          branch: {repo.branch}
                        </Typography>
                        {repo.language && (
                          <Chip
                            label={repo.language}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: "0.65rem" }}
                          />
                        )}
                        {repo.framework && (
                          <Chip
                            label={repo.framework}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: "0.65rem" }}
                          />
                        )}
                      </Stack>
                    </Box>
                    {!isEditing && (
                      <>
                        <Tooltip title="Edit stack metadata">
                          <IconButton size="small" onClick={() => beginEdit(repo)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove repository">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(repo.id)}
                              disabled={deletingId === repo.id}
                              color="error"
                            >
                              {deletingId === repo.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <DeleteOutlineIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  </Stack>

                  {isEditing && (
                    <Box sx={{ mt: 1.5 }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ mb: 1 }}
                      >
                        <TextField
                          label="Language"
                          placeholder="TypeScript, Python, Java…"
                          value={editLanguage}
                          onChange={(e) => setEditLanguage(e.target.value)}
                          size="small"
                          fullWidth
                          disabled={isSaving}
                          autoFocus
                        />
                        <TextField
                          label="Framework"
                          placeholder="Express, Spring Boot, React…"
                          value={editFramework}
                          onChange={(e) => setEditFramework(e.target.value)}
                          size="small"
                          fullWidth
                          disabled={isSaving}
                        />
                      </Stack>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={cancelEdit} disabled={isSaving}>
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleSaveEdit(repo.id)}
                          disabled={isSaving}
                          startIcon={
                            isSaving ? (
                              <CircularProgress size={14} />
                            ) : (
                              <SaveOutlinedIcon />
                            )
                          }
                        >
                          Save
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
