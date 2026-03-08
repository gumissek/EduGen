"use client";

import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { apiFetch, apiUrl, getToken } from "../lib/api";

type DocumentRow = {
  id: string;
  filename: string;
  created_at: string;
  variants_count: number;
};

export default function DocumentsView() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const documents = useQuery({
    queryKey: ["documents", page, query],
    queryFn: () => apiFetch<{ total: number; items: DocumentRow[] }>(`/api/documents?page=${page}&page_size=20&query=${encodeURIComponent(query)}`),
  });

  const ids = useMemo(() => documents.data?.items.map((i) => i.id) ?? [], [documents.data]);

  async function bulkDownload() {
    const token = getToken();
    const response = await fetch(apiUrl("/api/documents/bulk-download"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ document_ids: ids }),
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documents.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Historia wygenerowanych plików</Typography>
      <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
        <TextField
          fullWidth
          label="Wyszukaj"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <Button variant="outlined" disabled={!ids.length} onClick={bulkDownload}>
          Pobierz ZIP
        </Button>
      </Box>
      <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
        {(documents.data?.items ?? []).map((doc) => (
          <Paper key={doc.id} variant="outlined" sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography>{doc.filename}</Typography>
              <Typography variant="caption">Warianty: {doc.variants_count}</Typography>
            </Box>
            <Button href={apiUrl(`/api/documents/${doc.id}/download`)} target="_blank" rel="noreferrer" variant="contained" size="small">
              Pobierz
            </Button>
          </Paper>
        ))}
      </Box>
      {documents.data && documents.data.total === 0 && <Alert sx={{ mt: 2 }} severity="info">Brak dokumentów</Alert>}
      <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
        <Button variant="outlined" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Poprzednia
        </Button>
        <Button variant="outlined" disabled={(documents.data?.items.length ?? 0) < 20} onClick={() => setPage((p) => p + 1)}>
          Następna
        </Button>
      </Box>
    </Paper>
  );
}
