import {
  AppBar,
  Box,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
} from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import { useThemeMode } from "../../theme/ThemeModeProvider";

type HeaderProps = Readonly<{
  onOpenSidebar?: () => void;
  showSidebarButton?: boolean;
}>;

export function Header({ onOpenSidebar, showSidebarButton = false }: HeaderProps) {
  const { mode, toggle } = useThemeMode();

  return (
    <AppBar position="sticky" sx={{ zIndex: (theme) => theme.zIndex.appBar }}>
      <Toolbar sx={{ gap: 1, minHeight: 48, px: { xs: 1.5, sm: 2 } }}>
        {showSidebarButton && (
          <IconButton
            size="small"
            edge="start"
            onClick={onOpenSidebar}
            sx={{ mr: 0.5 }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title={mode === "dark" ? "Switch to light" : "Switch to dark"}>
            <IconButton onClick={toggle} size="small">
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
