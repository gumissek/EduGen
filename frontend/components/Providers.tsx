"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { useMemo, useState } from "react";

import { UIContext } from "./ui-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [queryClient] = useState(() => new QueryClient());

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <UIContext.Provider value={{ mode, toggleMode: () => setMode(mode === "light" ? "dark" : "light") }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </UIContext.Provider>
    </QueryClientProvider>
  );
}
