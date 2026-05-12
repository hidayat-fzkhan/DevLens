import type { PaletteOptions } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    canvas: string;
    border: { default: string; muted: string };
    category: {
      bugs: string;
      stories: string;
      repos: string;
    };
    state: {
      new: string;
      active: string;
      resolved: string;
      closed: string;
    };
  }
  interface PaletteOptions {
    canvas?: string;
    border?: { default: string; muted: string };
    category?: {
      bugs: string;
      stories: string;
      repos: string;
    };
    state?: {
      new: string;
      active: string;
      resolved: string;
      closed: string;
    };
  }
}

export const darkPalette: PaletteOptions = {
  mode: "dark",
  canvas: "#0d1117",
  background: {
    default: "#0d1117",
    paper: "#161b22",
  },
  border: {
    default: "#30363d",
    muted: "#21262d",
  },
  text: {
    primary: "#e6edf3",
    secondary: "#7d8590",
    disabled: "#484f58",
  },
  primary: {
    main: "#2f81f7",
    light: "#58a6ff",
    dark: "#1f6feb",
    contrastText: "#ffffff",
  },
  success: { main: "#3fb950", contrastText: "#0d1117" },
  warning: { main: "#d29922", contrastText: "#0d1117" },
  error: { main: "#f85149", contrastText: "#ffffff" },
  info: { main: "#58a6ff", contrastText: "#0d1117" },
  divider: "#30363d",
  action: {
    hover: "rgba(177, 186, 196, 0.12)",
    selected: "rgba(177, 186, 196, 0.16)",
    disabled: "rgba(177, 186, 196, 0.3)",
  },
  category: {
    bugs: "#f85149",
    stories: "#a371f7",
    repos: "#3fb950",
  },
  state: {
    new: "#3fb950",
    active: "#2f81f7",
    resolved: "#a371f7",
    closed: "#7d8590",
  },
};

export const lightPalette: PaletteOptions = {
  mode: "light",
  canvas: "#ffffff",
  background: {
    default: "#ffffff",
    paper: "#f6f8fa",
  },
  border: {
    default: "#d0d7de",
    muted: "#eaeef2",
  },
  text: {
    primary: "#1f2328",
    secondary: "#656d76",
    disabled: "#8c959f",
  },
  primary: {
    main: "#0969da",
    light: "#218bff",
    dark: "#0550ae",
    contrastText: "#ffffff",
  },
  success: { main: "#1a7f37", contrastText: "#ffffff" },
  warning: { main: "#9a6700", contrastText: "#ffffff" },
  error: { main: "#cf222e", contrastText: "#ffffff" },
  info: { main: "#0969da", contrastText: "#ffffff" },
  divider: "#d0d7de",
  action: {
    hover: "rgba(208, 215, 222, 0.32)",
    selected: "rgba(208, 215, 222, 0.48)",
    disabled: "rgba(208, 215, 222, 0.6)",
  },
  category: {
    bugs: "#cf222e",
    stories: "#8250df",
    repos: "#1a7f37",
  },
  state: {
    new: "#1a7f37",
    active: "#0969da",
    resolved: "#8250df",
    closed: "#656d76",
  },
};
