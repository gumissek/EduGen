"use client";

import { createContext } from "react";

export const UIContext = createContext({
  mode: "light" as "light" | "dark",
  toggleMode: () => {},
});
