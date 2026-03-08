"use client";

import { useEffect, useState } from "react";

import AppShell from "../components/AppShell";
import DocumentsView from "../components/DocumentsView";
import GenerationView from "../components/GenerationView";
import LoginForm from "../components/LoginForm";
import SettingsView from "../components/SettingsView";
import { getToken } from "../lib/api";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<"generate" | "documents" | "settings">("generate");

  useEffect(() => {
    setIsAuthenticated(!!getToken());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let timer: number | null = null;
    const reset = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        localStorage.removeItem("edugen_token");
        setIsAuthenticated(false);
      }, 15 * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click", "scroll"] as const;
    events.forEach((event) => window.addEventListener(event, reset));
    reset();

    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginForm onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <AppShell selected={view} onSelect={setView}>
      {view === "generate" && <GenerationView />}
      {view === "documents" && <DocumentsView />}
      {view === "settings" && <SettingsView />}
    </AppShell>
  );
}
