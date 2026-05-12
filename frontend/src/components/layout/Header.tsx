import {
  AppBar,
  Box,
  Button,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useThemeMode } from "../../theme/ThemeModeProvider";

type HeaderProps = Readonly<{
  currentPath: string;
  onNavigate: (path: string) => void;
}>;

const NAV_ITEMS = [
  { label: "Bugs", path: "/bugs" },
  { label: "User Stories", path: "/user-stories" },
] as const;

export function Header({ currentPath, onNavigate }: HeaderProps) {
  const { mode, toggle } = useThemeMode();

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 1, minHeight: 56 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexGrow: 1,
            cursor: "pointer",
            "&:hover": { opacity: 0.85 },
          }}
          onClick={() => onNavigate("/")}
        >
          <PsychologyOutlinedIcon
            sx={{ fontSize: 22, color: "primary.main" }}
          />
          <Typography
            variant="h5"
            component="div"
            sx={{ fontWeight: 600, letterSpacing: "-0.3px" }}
          >
            DevLens
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: 1, display: { xs: "none", sm: "inline" } }}
          >
            AI-powered triage
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentPath === item.path ||
              currentPath.startsWith(`${item.path}/`);

            return (
              <Button
                key={item.path}
                size="small"
                onClick={() => onNavigate(item.path)}
                sx={(theme) => ({
                  px: 1.5,
                  color: isActive
                    ? theme.palette.text.primary
                    : theme.palette.text.secondary,
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive
                    ? theme.palette.action.selected
                    : "transparent",
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                    color: theme.palette.text.primary,
                  },
                })}
              >
                {item.label}
              </Button>
            );
          })}

          <Tooltip title={mode === "dark" ? "Switch to light" : "Switch to dark"}>
            <IconButton onClick={toggle} size="small" sx={{ ml: 0.5 }}>
              {mode === "dark" ? (
                <LightModeOutlinedIcon fontSize="small" />
              ) : (
                <DarkModeOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
