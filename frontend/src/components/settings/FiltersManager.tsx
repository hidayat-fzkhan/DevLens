import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import {
  fetchAreas,
  fetchIterations,
  fetchSettings,
  saveSettings,
} from "../../services/api";
import type { AreaPath, IterationPath, WorkItemFilters } from "../../types";
import { useToast } from "../common/ToastProvider";

const COMMON_STATES = [
  "New",
  "Defined",
  "Ready To Work",
  "Active",
  "Resolved",
  "Closed",
  "Removed",
];

function formatRange(start?: string, finish?: string): string {
  if (!start && !finish) return "";
  const fmt = (s?: string) => (s ? new Date(s).toLocaleDateString() : "—");
  return `${fmt(start)} → ${fmt(finish)}`;
}

function isCurrentIteration(iteration: IterationPath, now: Date): boolean {
  if (!iteration.startDate || !iteration.finishDate) return false;
  const start = new Date(iteration.startDate).getTime();
  const finish = new Date(iteration.finishDate).getTime();
  const t = now.getTime();
  return t >= start && t <= finish;
}

export function FiltersManager() {
  const { showToast } = useToast();
  const [areas, setAreas] = useState<AreaPath[]>([]);
  const [iterations, setIterations] = useState<IterationPath[]>([]);
  const [filters, setFilters] = useState<WorkItemFilters>({ states: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [settingsRes, areasRes, iterationsRes] = await Promise.all([
        fetchSettings(signal),
        fetchAreas(signal),
        fetchIterations(signal),
      ]);
      setFilters(settingsRes.settings);
      setAreas(areasRes.areas);
      setIterations(iterationsRes.iterations);
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

  const selectedArea = useMemo(
    () => areas.find((a) => a.path === filters.areaPath) ?? null,
    [areas, filters.areaPath],
  );
  const selectedIteration = useMemo(
    () => iterations.find((i) => i.path === filters.iterationPath) ?? null,
    [iterations, filters.iterationPath],
  );

  const currentIteration = useMemo(() => {
    const now = new Date();
    return iterations.find((i) => isCurrentIteration(i, now));
  }, [iterations]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const next = await saveSettings(filters);
      setFilters(next.settings);
      showToast("Filters saved", "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleState = (state: string) => {
    setFilters((prev) => {
      const has = prev.states.includes(state);
      return {
        ...prev,
        states: has
          ? prev.states.filter((s) => s !== state)
          : [...prev.states, state],
      };
    });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <FilterAltOutlinedIcon sx={{ color: "text.secondary" }} />
          <Typography variant="h6" fontWeight={600}>
            Work item filters
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Applied to both Bugs and User Stories. Area path is required — the
          list pages stay empty until one is selected. Iteration narrows the
          result to a specific sprint.
        </Typography>

        {loadError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setLoadError(null)}
          >
            {loadError}
          </Alert>
        )}

        {loading ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading filters from Azure DevOps…
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            <Autocomplete
              options={areas}
              value={selectedArea}
              onChange={(_e, value) =>
                setFilters((prev) => ({
                  ...prev,
                  areaPath: value?.path,
                }))
              }
              getOptionLabel={(opt) => opt.path}
              isOptionEqualToValue={(opt, value) => opt.path === value.path}
              renderInput={(p) => (
                <TextField
                  {...p}
                  required
                  size="small"
                  label="Area path"
                  placeholder="Choose an area path"
                />
              )}
            />

            <Autocomplete
              options={iterations}
              value={selectedIteration}
              onChange={(_e, value) =>
                setFilters((prev) => ({
                  ...prev,
                  iterationPath: value?.path,
                }))
              }
              getOptionLabel={(opt) => opt.path}
              isOptionEqualToValue={(opt, value) => opt.path === value.path}
              renderOption={(props, option) => {
                const { key, ...rest } = props as {
                  key: string;
                } & React.HTMLAttributes<HTMLLIElement>;
                const isCurrent =
                  currentIteration && option.path === currentIteration.path;
                return (
                  <Box component="li" key={key} {...rest}>
                    <Stack sx={{ width: "100%" }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={500}>
                          {option.name}
                        </Typography>
                        {isCurrent && (
                          <Chip
                            label="Current"
                            size="small"
                            color="primary"
                            sx={{ height: 18 }}
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {option.path}
                        {option.startDate &&
                          ` · ${formatRange(option.startDate, option.finishDate)}`}
                      </Typography>
                    </Stack>
                  </Box>
                );
              }}
              renderInput={(p) => (
                <TextField
                  {...p}
                  size="small"
                  label="Iteration / Sprint (optional)"
                  placeholder="Leave blank to include all iterations"
                />
              )}
            />

            <Box>
              <Typography variant="overline" color="text.secondary">
                Work item states
              </Typography>
              <Stack
                direction="row"
                flexWrap="wrap"
                gap={0.75}
                sx={{ mt: 0.5 }}
              >
                {COMMON_STATES.map((state) => {
                  const isSelected = filters.states.includes(state);
                  return (
                    <Chip
                      key={state}
                      label={state}
                      onClick={() => toggleState(state)}
                      variant={isSelected ? "filled" : "outlined"}
                      color={isSelected ? "primary" : "default"}
                      sx={{ height: 26, cursor: "pointer" }}
                    />
                  );
                })}
              </Stack>
              {filters.states.length === 0 && (
                <Typography
                  variant="caption"
                  color="warning.main"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  At least one state required — defaults to New + Active when
                  saved.
                </Typography>
              )}
            </Box>

            <Box>
              <Button
                variant="contained"
                startIcon={
                  saving ? <CircularProgress size={14} /> : <SaveOutlinedIcon />
                }
                onClick={handleSave}
                disabled={saving || !filters.areaPath}
              >
                Save filters
              </Button>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
