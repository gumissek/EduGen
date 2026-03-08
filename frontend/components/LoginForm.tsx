"use client";

import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";

import { apiFetch, setToken } from "../lib/api";

type Props = {
  onSuccess: () => void;
};

export default function LoginForm({ onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setToken(data.token);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd logowania");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper sx={{ maxWidth: 420, mx: "auto", mt: 12, p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Logowanie
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        EduGen Local jest zabezpieczony hasłem.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          fullWidth
          type="password"
          label="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button variant="contained" onClick={submit} disabled={loading || !password}>
          Wejdź
        </Button>
      </Box>
    </Paper>
  );
}
