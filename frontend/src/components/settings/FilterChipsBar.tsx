import { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Popover,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import CloseIcon from "@mui/icons-material/Close";
import {
  fetchAreas,
  fetchIterations,
  saveSettings as apiSaveSettings,
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

type FilterChipsBarProps = Readonly<{
  filters: WorkItemFilters;
  onChange: (next: WorkItemFilters) => void;
  onOpenSettings: () => void;
}>;

type ActiveEditor = "area" | "iteration" | "states" | null;

function lastSegment(path: string | undefined): string {
  if (!path) return "";
  const parts = path.split("\\");
  return parts[parts.length - 1] ?? path;
}

export function FilterChipsBar({
  filters,
  onChange,
  onOpenSettings,
}: FilterChipsBarProps) {
  const { showToast } = useToast();
  const [areas, setAreas] = useState<AreaPath[]>([]);
  const [iterations, setIterations] = useState<IterationPath[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);

  const ensureOptionsLoaded = async () => {
    if (optionsLoaded || optionsLoading) return;
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const [areasRes, iterationsRes] = await Promise.all([
        fetchAreas(),
        fetchIterations(),
      ]);
      setAreas(areasRes.areas);
      setIterations(iterationsRes.iterations);
      setOptionsLoaded(true);
    } catch (err) {
      setOptionsError((err as Error).message);
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeEditor) void ensureOptionsLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEditor]);

  const openEditor = (
    editor: ActiveEditor,
    event: React.MouseEvent<HTMLElement>,
  ) => {
    setAnchorEl(event.currentTarget);
    setActiveEditor(editor);
  };

  const closeEditor = () => {
    setActiveEditor(null);
    setAnchorEl(null);
  };

  const persist = async (next: WorkItemFilters) => {
    setSaving(true);
    try {
      const res = await apiSaveSettings(next);
      onChange(res.settings);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAreaSelect = async (value: AreaPath | null) => {
    if (!value) return;
    closeEditor();
    await persist({ ...filters, areaPath: value.path });
  };

  const handleIterationSelect = async (value: IterationPath | null) => {
    closeEditor();
    await persist({ ...filters, iterationPath: value?.path });
  };

  const handleStatesSave = async (states: string[]) => {
    closeEditor();
    await persist({ ...filters, states });
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <FilterAltOutlinedIcon sx={{ fontSize: 16, color: "text.disabled" }} />

      <Chip
        label={`Area: ${lastSegment(filters.areaPath)}`}
        size="small"
        variant="outlined"
        onClick={(e) => openEditor("area", e)}
        clickable
      />

      <Chip
        label={
          filters.iterationPath
            ? `Sprint: ${lastSegment(filters.iterationPath)}`
            : "Sprint: All"
        }
        size="small"
        variant="outlined"
        onClick={(e) => openEditor("iteration", e)}
        onDelete={
          filters.iterationPath
            ? () => void persist({ ...filters, iterationPath: undefined })
            : undefined
        }
        deleteIcon={<CloseIcon />}
        clickable
      />

      <Chip
        label={`States: ${filters.states.length > 0 ? filters.states.join(", ") : "—"}`}
        size="small"
        variant="outlined"
        onClick={(e) => openEditor("states", e)}
        clickable
      />

      {saving && <CircularProgress size={14} sx={{ ml: 0.5 }} />}

      <Button
        size="small"
        variant="text"
        startIcon={<SettingsOutlinedIcon fontSize="small" />}
        onClick={onOpenSettings}
        sx={{ ml: "auto" }}
      >
        Settings
      </Button>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closeEditor}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: (theme) => ({
              mt: 0.5,
              minWidth: 320,
              maxWidth: 420,
              border: `1px solid ${theme.palette.border.default}`,
            }),
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {optionsLoading && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={14} />
              <Typography variant="body2" color="text.secondary">
                Loading options…
              </Typography>
            </Stack>
          )}

          {optionsError && (
            <Typography variant="body2" color="error">
              {optionsError}
            </Typography>
          )}

          {optionsLoaded && activeEditor === "area" && (
            <AreaPicker
              areas={areas}
              value={filters.areaPath}
              onSelect={handleAreaSelect}
            />
          )}

          {optionsLoaded && activeEditor === "iteration" && (
            <IterationPicker
              iterations={iterations}
              value={filters.iterationPath}
              onSelect={handleIterationSelect}
              onClear={() => void handleIterationSelect(null)}
            />
          )}

          {optionsLoaded && activeEditor === "states" && (
            <StatesPicker
              initial={filters.states}
              onSave={handleStatesSave}
              onCancel={closeEditor}
            />
          )}
        </Box>
      </Popover>
    </Stack>
  );
}

type AreaPickerProps = Readonly<{
  areas: AreaPath[];
  value: string | undefined;
  onSelect: (value: AreaPath | null) => void;
}>;

function AreaPicker({ areas, value, onSelect }: AreaPickerProps) {
  const current = areas.find((a) => a.path === value) ?? null;
  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary">
        Area path
      </Typography>
      <Autocomplete
        options={areas}
        value={current}
        getOptionLabel={(opt) => opt.path}
        isOptionEqualToValue={(opt, value) => opt.path === value.path}
        onChange={(_e, v) => onSelect(v)}
        openOnFocus
        autoHighlight
        renderInput={(p) => (
          <TextField
            {...p}
            size="small"
            autoFocus
            placeholder="Choose an area path"
          />
        )}
      />
    </Stack>
  );
}

type IterationPickerProps = Readonly<{
  iterations: IterationPath[];
  value: string | undefined;
  onSelect: (value: IterationPath | null) => void;
  onClear: () => void;
}>;

function IterationPicker({
  iterations,
  value,
  onSelect,
  onClear,
}: IterationPickerProps) {
  const current = iterations.find((i) => i.path === value) ?? null;
  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="overline" color="text.secondary">
          Iteration / Sprint
        </Typography>
        {value && (
          <Button size="small" variant="text" onClick={onClear}>
            Clear
          </Button>
        )}
      </Stack>
      <Autocomplete
        options={iterations}
        value={current}
        getOptionLabel={(opt) => opt.path}
        isOptionEqualToValue={(opt, value) => opt.path === value.path}
        onChange={(_e, v) => onSelect(v)}
        openOnFocus
        autoHighlight
        renderInput={(p) => (
          <TextField
            {...p}
            size="small"
            autoFocus
            placeholder="Leave blank for all sprints"
          />
        )}
      />
    </Stack>
  );
}

type StatesPickerProps = Readonly<{
  initial: string[];
  onSave: (states: string[]) => void;
  onCancel: () => void;
}>;

function StatesPicker({ initial, onSave, onCancel }: StatesPickerProps) {
  const [selected, setSelected] = useState<string[]>(initial);

  const toggle = (state: string) => {
    setSelected((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state],
    );
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="overline" color="text.secondary">
        Work item states
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {COMMON_STATES.map((state) => {
          const isSelected = selected.includes(state);
          return (
            <Chip
              key={state}
              label={state}
              onClick={() => toggle(state)}
              variant={isSelected ? "filled" : "outlined"}
              color={isSelected ? "primary" : "default"}
              sx={{ height: 24, cursor: "pointer" }}
            />
          );
        })}
      </Stack>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => onSave(selected)}
        >
          Apply
        </Button>
      </Stack>
    </Stack>
  );
}
