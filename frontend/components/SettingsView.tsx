"use client";

import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "../lib/api";

export default function SettingsView() {
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<{ default_model: string; has_api_key: boolean }>("/api/settings"),
  });

  const [model, setModel] = useState("gpt-5-mini");
  const [apiKey, setApiKey] = useState("");

  const update = useMutation({
    mutationFn: () => apiFetch("/api/settings", { method: "PUT", body: JSON.stringify({ default_model: model, openai_api_key: apiKey || undefined }) }),
  });

  const backup = useMutation({
    mutationFn: () => apiFetch("/api/backups", { method: "POST" }),
  });

  return (
    <Paper sx={{ p: 2, display: "grid", gap: 2 }}>
      <Typography variant="h6">Ustawienia i diagnostyka</Typography>
      <TextField
        label="Domyślny model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        helperText={settings.data?.has_api_key ? "Klucz API ustawiony" : "Klucz API nieustawiony"}
      />
      <TextField
        label="OpenAI API Key"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="contained" onClick={() => update.mutate()}>
          Zapisz ustawienia
        </Button>
        <Button variant="outlined" onClick={() => backup.mutate()}>
          Utwórz backup
        </Button>
      </Box>
      {update.isSuccess && <Alert severity="success">Ustawienia zapisane</Alert>}
      {backup.isSuccess && <Alert severity="success">Backup wykonany</Alert>}
    </Paper>
  );
}
