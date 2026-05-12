import { Box, Button, InputAdornment, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import { forwardRef, useMemo, type Ref } from "react";

type SearchBarProps = Readonly<{
  label: string;
  placeholder: string;
  query: string;
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSearch: (query?: string) => void;
  onStop: () => void;
  inputRef?: Ref<HTMLInputElement>;
}>;

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { label, placeholder, query, loading, onQueryChange, onSearch, onStop, inputRef },
  _outerRef,
) {
  const hasQuery = useMemo(() => query.trim().length > 0, [query]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(query.trim() || undefined);
  };

  const handleClear = () => {
    onQueryChange("");
    onSearch();
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", gap: 1.5 }}>
      <TextField
        label={label}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        size="small"
        fullWidth
        inputRef={inputRef}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
            </InputAdornment>
          ),
          endAdornment: !query && !loading ? (
            <InputAdornment position="end">
              <Typography
                component="kbd"
                variant="caption"
                sx={(theme) => ({
                  fontFamily: theme.typography.fontFamily,
                  border: `1px solid ${theme.palette.border.default}`,
                  borderRadius: 0.75,
                  px: 0.75,
                  py: 0.1,
                  color: theme.palette.text.secondary,
                  fontSize: "0.7rem",
                })}
              >
                /
              </Typography>
            </InputAdornment>
          ) : undefined,
        }}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        startIcon={<SearchIcon />}
        sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
      >
        Search
      </Button>
      {loading ? (
        <Button
          variant="contained"
          color="error"
          onClick={onStop}
          startIcon={<StopCircleOutlinedIcon />}
          sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
        >
          Stop
        </Button>
      ) : (
        <Button
          variant="outlined"
          disabled={!hasQuery}
          onClick={handleClear}
          startIcon={<ClearIcon />}
          sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
        >
          Clear
        </Button>
      )}
    </Box>
  );
});
