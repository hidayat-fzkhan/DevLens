import { Box, Drawer, LinearProgress, useMediaQuery, useTheme } from "@mui/material";
import { useState, type ReactNode } from "react";
import type { RecentTicket } from "../../hooks/useRecentTickets";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

type LayoutProps = Readonly<{
  children: ReactNode;
  loading?: boolean;
  currentPath: string;
  onNavigate: (path: string) => void;
  recent: RecentTicket[];
}>;

export function Layout({ children, loading, currentPath, onNavigate, recent }: LayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavigateFromSidebar = (path: string) => {
    onNavigate(path);
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {!isMobile && (
        <Sidebar
          currentPath={currentPath}
          onNavigate={handleNavigateFromSidebar}
          recent={recent}
        />
      )}

      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: (drawerTheme) => ({
              borderRight: `1px solid ${drawerTheme.palette.border.default}`,
            }),
          }}
        >
          <Sidebar
            currentPath={currentPath}
            onNavigate={handleNavigateFromSidebar}
            recent={recent}
          />
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header
          showSidebarButton={isMobile}
          onOpenSidebar={() => setDrawerOpen(true)}
        />
        {loading && <LinearProgress sx={{ height: 2 }} />}
        <Box
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2.5, md: 3.5 },
            maxWidth: 1200,
            width: "100%",
            mx: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
