"use client";

import MenuBookIcon from "@mui/icons-material/MenuBook";
import SettingsIcon from "@mui/icons-material/Settings";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  Toolbar,
  Typography,
} from "@mui/material";
import { useContext } from "react";

import { UIContext } from "./ui-context";

const drawerWidth = 260;

type AppShellProps = {
  selected: "generate" | "documents" | "settings";
  onSelect: (value: "generate" | "documents" | "settings") => void;
  children: React.ReactNode;
};

export default function AppShell({ selected, onSelect, children }: AppShellProps) {
  const { mode, toggleMode } = useContext(UIContext);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            EduGen Local
          </Typography>
          <Typography variant="body2">Dark mode</Typography>
          <Switch checked={mode === "dark"} onChange={toggleMode} />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <List>
          <ListItemButton selected={selected === "generate"} onClick={() => onSelect("generate")}>
            <ListItemIcon>
              <UploadFileIcon />
            </ListItemIcon>
            <ListItemText primary="Generowanie" />
          </ListItemButton>
          <ListItemButton selected={selected === "documents"} onClick={() => onSelect("documents")}>
            <ListItemIcon>
              <MenuBookIcon />
            </ListItemIcon>
            <ListItemText primary="Historia" />
          </ListItemButton>
          <ListItemButton selected={selected === "settings"} onClick={() => onSelect("settings")}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Ustawienia" />
          </ListItemButton>
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: `${drawerWidth}px` }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
