"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch, apiUrl } from "../lib/api";
import { GenerationPayload, SourceFile, Subject } from "../lib/types";

const languageLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function GenerationView() {
  const qc = useQueryClient();
  const [statusId, setStatusId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>("");
  const [prototype, setPrototype] = useState<{ original_content: string; edited_content: string | null; answer_key: string } | null>(null);
  const [edited, setEdited] = useState("");
  const [repromptText, setRepromptText] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);

  const [form, setForm] = useState<GenerationPayload>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("edugen_generation_form");
      if (cached) return JSON.parse(cached) as GenerationPayload;
    }
    return {
      subject_id: "",
      content_type: "test",
      education_level: "sp",
      class_level: 4,
      language_level: null,
      topic: "",
      instructions: "",
      difficulty: 2,
      total_questions: 10,
      open_questions: 4,
      closed_questions: 6,
      variants_count: 1,
      source_file_ids: [],
    };
  });

  useEffect(() => {
    localStorage.setItem("edugen_generation_form", JSON.stringify(form));
  }, [form]);

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: () => apiFetch<Subject[]>("/api/subjects"),
  });

  const sourceFiles = useQuery({
    queryKey: ["files", form.subject_id],
    queryFn: () => apiFetch<SourceFile[]>(`/api/files${form.subject_id ? `?subject_id=${form.subject_id}` : ""}`),
  });

  const isLanguageSubject = useMemo(() => {
    const subject = subjects.data?.find((item) => item.id === form.subject_id);
    return subject?.name.toLowerCase().includes("język") || false;
  }, [subjects.data, form.subject_id]);

  const createGeneration = useMutation({
    mutationFn: () => apiFetch<{ id: string; status: string }>("/api/generations", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: (data) => {
      setStatusId(data.id);
      setStatusText("processing");
    },
  });

  useEffect(() => {
    if (!statusId || statusText === "ready" || statusText === "failed") return;
    const interval = setInterval(async () => {
      try {
        const status = await apiFetch<{ id: string; status: string }>(`/api/generations/${statusId}`);
        setStatusText(status.status);
        if (status.status === "ready") {
          const p = await apiFetch<{ original_content: string; edited_content: string | null; answer_key: string }>(`/api/prototypes/${statusId}`);
          setPrototype(p);
          setEdited(p.edited_content ?? p.original_content);
        }
      } catch {
        setStatusText("failed");
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [statusId, statusText]);

  const savePrototype = useMutation({
    mutationFn: () => apiFetch("/api/prototypes/" + statusId, { method: "PUT", body: JSON.stringify({ edited_content: edited }) }),
  });

  const reprompt = useMutation({
    mutationFn: () => apiFetch("/api/prototypes/" + statusId + "/reprompt", { method: "POST", body: JSON.stringify({ prompt: repromptText }) }),
    onSuccess: async () => {
      if (!statusId) return;
      const p = await apiFetch<{ original_content: string; edited_content: string | null; answer_key: string }>(`/api/prototypes/${statusId}`);
      setPrototype(p);
      setEdited(p.edited_content ?? p.original_content);
      setRepromptText("");
    },
  });

  const finalize = useMutation({
    mutationFn: async () => {
      if (!statusId) return;
      await savePrototype.mutateAsync();
      const response = await apiFetch<{ status: string; document_id?: string }>(`/api/generations/${statusId}/finalize`, { method: "POST" });
      setDocumentId(response.document_id ?? null);
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: { file: File; subjectId: string }) => {
      const formData = new FormData();
      formData.append("file", payload.file);

      const token = localStorage.getItem("edugen_token");
      const response = await fetch(apiUrl(`/api/files?subject_id=${payload.subjectId}`), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.detail ?? "Błąd uploadu");
      }
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files", form.subject_id] });
    },
  });

  const canSubmit =
    !!form.subject_id &&
    form.topic.trim().length > 1 &&
    (form.content_type === "worksheet" || form.content_type === "lesson_materials" || form.total_questions === form.open_questions + form.closed_questions);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Konfiguracja generowania
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Rodzaj treści</InputLabel>
              <Select
                value={form.content_type}
                label="Rodzaj treści"
                onChange={(e) => setForm((p) => ({ ...p, content_type: e.target.value as GenerationPayload["content_type"] }))}
              >
                <MenuItem value="worksheet">Karta pracy</MenuItem>
                <MenuItem value="exam">Sprawdzian</MenuItem>
                <MenuItem value="quiz">Kartkówka</MenuItem>
                <MenuItem value="test">Test</MenuItem>
                <MenuItem value="lesson_materials">Materiały na zajęcia</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Poziom</InputLabel>
              <Select
                value={form.education_level}
                label="Poziom"
                onChange={(e) => setForm((p) => ({ ...p, education_level: e.target.value as "sp" | "lo", class_level: 1 }))}
              >
                <MenuItem value="sp">Szkoła podstawowa</MenuItem>
                <MenuItem value="lo">Szkoła średnia</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Klasa"
              value={form.class_level}
              onChange={(e) => setForm((p) => ({ ...p, class_level: Number(e.target.value || 1) }))}
              inputProps={{ min: 1, max: form.education_level === "sp" ? 8 : 4 }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Przedmiot</InputLabel>
              <Select
                value={form.subject_id}
                label="Przedmiot"
                onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))}
              >
                {(subjects.data ?? []).map((subject) => (
                  <MenuItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {isLanguageSubject && (
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Poziom języka</InputLabel>
                <Select
                  value={form.language_level ?? ""}
                  label="Poziom języka"
                  onChange={(e) => setForm((p) => ({ ...p, language_level: e.target.value || null }))}
                >
                  {languageLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid size={12}>
            <TextField
              fullWidth
              label="Temat"
              value={form.topic}
              onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Zalecenia"
              value={form.instructions}
              onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
            />
          </Grid>

          {!(form.content_type === "worksheet" || form.content_type === "lesson_materials") && (
            <>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Łącznie pytań"
                  value={form.total_questions}
                  onChange={(e) => setForm((p) => ({ ...p, total_questions: Number(e.target.value || 0) }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Pytania otwarte"
                  value={form.open_questions}
                  onChange={(e) => setForm((p) => ({ ...p, open_questions: Number(e.target.value || 0) }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Pytania zamknięte"
                  value={form.closed_questions}
                  onChange={(e) => setForm((p) => ({ ...p, closed_questions: Number(e.target.value || 0) }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Warianty (grupy)"
                  value={form.variants_count}
                  onChange={(e) => setForm((p) => ({ ...p, variants_count: Number(e.target.value || 1) }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Trudność</InputLabel>
                  <Select
                    value={String(form.difficulty)}
                    label="Trudność"
                    onChange={(e) => setForm((p) => ({ ...p, difficulty: Number(e.target.value) }))}
                  >
                    <MenuItem value="1">Łatwy</MenuItem>
                    <MenuItem value="2">Średni</MenuItem>
                    <MenuItem value="3">Trudny</MenuItem>
                    <MenuItem value="4">Bardzo trudny</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Pliki źródłowe</InputLabel>
              <Select
                multiple
                value={form.source_file_ids}
                onChange={(e) => setForm((p) => ({ ...p, source_file_ids: e.target.value as string[] }))}
                input={<OutlinedInput label="Pliki źródłowe" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {(selected as string[]).map((id) => {
                      const file = sourceFiles.data?.find((item) => item.id === id);
                      return <Chip key={id} label={file?.filename ?? id} />;
                    })}
                  </Box>
                )}
              >
                {(sourceFiles.data ?? []).map((file) => (
                  <MenuItem key={file.id} value={file.id}>
                    {file.filename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={12}>
            <Button component="label" variant="outlined" disabled={!form.subject_id || uploadMutation.isPending}>
              Dodaj plik źródłowy
              <input
                hidden
                type="file"
                accept=".pdf,.docx,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && form.subject_id) {
                    uploadMutation.mutate({ file, subjectId: form.subject_id });
                  }
                }}
              />
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => createGeneration.mutate()} disabled={createGeneration.isPending || !canSubmit}>
            Generuj prototyp
          </Button>
        </Box>
      </Paper>

      {statusId && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Status generowania</Typography>
          <Typography variant="body2">ID: {statusId}</Typography>
          <Alert severity={statusText === "failed" ? "error" : "info"} sx={{ mt: 1 }}>
            {statusText || "processing"}
          </Alert>
        </Paper>
      )}

      {prototype && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Edycja prototypu
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={10}
            label="Treść"
            value={edited}
            onChange={(e) => setEdited(e.target.value)}
          />
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Button variant="outlined" onClick={() => setEdited(prototype.original_content)}>
              Przywróć oryginał
            </Button>
            <Button variant="contained" onClick={() => savePrototype.mutate()}>
              Zapisz zmiany
            </Button>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 2 }}
            label="Uwagi do AI"
            value={repromptText}
            onChange={(e) => setRepromptText(e.target.value)}
          />
          <Button sx={{ mt: 1 }} variant="outlined" onClick={() => reprompt.mutate()} disabled={!repromptText.trim()}>
            Wdróż poprawki (reprompt)
          </Button>

          <Typography sx={{ mt: 2, whiteSpace: "pre-wrap" }} variant="body2">
            <strong>Klucz odpowiedzi:</strong>
            {"\n"}
            {prototype.answer_key}
          </Typography>

          <Button sx={{ mt: 2 }} variant="contained" color="success" onClick={() => finalize.mutate()}>
            Generuj finalny DOCX
          </Button>
          {documentId && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Wygenerowano dokument. ID: {documentId}
            </Alert>
          )}
        </Paper>
      )}
    </Box>
  );
}
