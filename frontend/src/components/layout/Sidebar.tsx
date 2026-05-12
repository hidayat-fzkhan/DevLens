import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import type { ReactNode } from "react";
import type { RecentTicket } from "../../hooks/useRecentTickets";

const SIDEBAR_WIDTH = 240;

type NavItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Bugs", path: "/bugs", icon: <BugReportOutlinedIcon fontSize="small" /> },
  {
    label: "User Stories",
    path: "/user-stories",
    icon: <AutoStoriesOutlinedIcon fontSize="small" />,
  },
  { label: "Settings", path: "/settings", icon: <SettingsOutlinedIcon fontSize="small" /> },
];

type SidebarProps = Readonly<{
  currentPath: string;
  onNavigate: (path: string) => void;
  recent: RecentTicket[];
}>;

export function Sidebar({ currentPath, onNavigate, recent }: SidebarProps) {
  return (
    <Box
      sx={(theme) => ({
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: `1px solid ${theme.palette.border.default}`,
        backgroundColor: theme.palette.background.paper,
        display: "flex",
        flexDirection: "column",
      })}
    >
      <Box
        sx={{
          px: 2,
          py: 1.75,
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          "&:hover": { opacity: 0.85 },
        }}
        onClick={() => onNavigate("/")}
      >
        <PsychologyOutlinedIcon sx={{ fontSize: 22, color: "primary.main" }} />
        <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.3px" }}>
          DevLens
        </Typography>
      </Box>

      <Box sx={(theme) => ({ borderTop: `1px solid ${theme.palette.border.muted}` })} />

      <Stack sx={{ flex: 1, overflowY: "auto", py: 1 }}>
        <SidebarSectionLabel>Navigate</SidebarSectionLabel>
        <List dense disablePadding>
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentPath === item.path ||
              currentPath.startsWith(`${item.path}/`);
            return (
              <ListItemButton
                key={item.path}
                onClick={() => onNavigate(item.path)}
                sx={(theme) => ({
                  mx: 1,
                  borderRadius: 1,
                  py: 0.5,
                  color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                  backgroundColor: isActive
                    ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.15 : 0.1)
                    : "transparent",
                  "&:hover": {
                    backgroundColor: isActive
                      ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.14)
                      : theme.palette.action.hover,
                    color: theme.palette.text.primary,
                  },
                })}
              >
                <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    variant: "body2",
                    fontWeight: isActive ? 600 : 500,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        {recent.length > 0 && (
          <>
            <Box sx={{ mt: 2 }}>
              <SidebarSectionLabel>Recent</SidebarSectionLabel>
            </Box>
            <List dense disablePadding>
              {recent.map((item) => {
                const path = `/${item.category}/analyze/${item.id}`;
                const isActive = currentPath === path;
                return (
                  <ListItemButton
                    key={`${item.category}:${item.id}`}
                    onClick={() => onNavigate(path)}
                    sx={(theme) => ({
                      mx: 1,
                      borderRadius: 1,
                      py: 0.4,
                      color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                      backgroundColor: isActive
                        ? theme.palette.action.selected
                        : "transparent",
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                        color: theme.palette.text.primary,
                      },
                    })}
                  >
                    <ListItemText
                      primary={`#${item.id}`}
                      secondary={item.title}
                      primaryTypographyProps={{
                        variant: "caption",
                        sx: (theme) => ({
                          fontFamily: theme.typography.fontFamily,
                          fontWeight: 600,
                        }),
                      }}
                      secondaryTypographyProps={{
                        variant: "body2",
                        noWrap: true,
                        sx: { fontSize: "0.75rem" },
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </>
        )}
      </Stack>
    </Box>
  );
}

function SidebarSectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{
        px: 2.5,
        py: 0.5,
        color: "text.secondary",
        letterSpacing: "0.5px",
        fontWeight: 600,
      }}
    >
      {children}
    </Typography>
  );
}

Sidebar.WIDTH = SIDEBAR_WIDTH;
