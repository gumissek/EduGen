'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GradingIcon from '@mui/icons-material/Grading';
import QuizIcon from '@mui/icons-material/Quiz';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import ClassIcon from '@mui/icons-material/Class';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import CardActions from '@mui/material/CardActions';
import Divider from '@mui/material/Divider';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Document } from '@/schemas/document';
import { CONTENT_TYPES, EDUCATION_LEVELS } from '@/lib/constants';
import DocumentCard from '@/components/documents/DocumentCard';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * Drill-down hierarchy (5 levels):
 *   1. type           — content type (worksheet, test, …)
 *   2. educationLevel — education level (primary, secondary, or custom)
 *   3. classLevel     — class level (Klasa 4, Semestr 2, or custom)
 *   4. subject        — subject name
 *   5. documents      — actual document cards
 */
type DrillLevel = 'type' | 'educationLevel' | 'classLevel' | 'subject' | 'documents';

interface DrillState {
  level: DrillLevel;
  contentType?: string;
  educationLevel?: string;
  educationLevelLabel?: string;
  classLevel?: string;
  subjectId?: string;
  subjectName?: string;
}

/** Human-readable label for an education level value. */
function educationLevelLabel(value: string): string {
  const v = value.trim();
  return EDUCATION_LEVELS.find((e) => e.value === v)?.label ?? (v || 'Bez poziomu');
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'worksheet': return <AssignmentIcon fontSize="large" />;
    case 'test': return <GradingIcon fontSize="large" />;
    case 'quiz': return <QuizIcon fontSize="large" />;
    case 'exam': return <DescriptionIcon fontSize="large" />;
    case 'lesson_materials': return <MenuBookIcon fontSize="large" />;
    default: return <AssignmentIcon fontSize="large" />;
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();
  const [drill, setDrill] = React.useState<DrillState>({ level: 'type' });
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Fetch all documents (up to 1000) for client-side grouping
  const { data: docsData, isLoading } = useQuery<Document[]>({
    queryKey: ['documents', 'all'],
    queryFn: async () => {
      const res = await api.get<DocumentListResponse>('/api/documents?per_page=1000');
      return res.data.documents;
    },
  });
  const allDocs: Document[] = docsData ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      success('Dokument został usunięty');
    },
    onError: () => error('Błąd podczas usuwania dokumentu'),
  });

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  // --- Derived data for each drill level ---

  // Level 1: unique content types that have at least 1 document
  const contentTypeGroups = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const doc of allDocs) {
      const ct = doc.content_type || '';
      if (ct) counts[ct] = (counts[ct] || 0) + 1;
    }
    const known = CONTENT_TYPES.filter(t => counts[t.value]).map(t => ({ ...t, count: counts[t.value] }));
    const knownValues = new Set(CONTENT_TYPES.map(t => t.value) as readonly string[]);
    const unknown = Object.entries(counts)
      .filter(([v]) => !knownValues.has(v))
      .map(([v, count]) => ({ value: v, label: v, count }));
    return [...known, ...unknown];
  }, [allDocs]);

  // Level 2: unique education levels for selected content_type
  const educationLevelGroups = React.useMemo(() => {
    if (!drill.contentType) return [];
    const filtered = allDocs.filter(d => d.content_type === drill.contentType);
    const counts: Record<string, number> = {};
    for (const doc of filtered) {
      const el = (doc.education_level ?? '').trim();
      if (el) counts[el] = (counts[el] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([value, count]) => ({
        value,
        label: educationLevelLabel(value),
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pl'));
  }, [allDocs, drill.contentType]);

  // Level 3: unique class levels for selected content_type + education_level
  const classLevelGroups = React.useMemo(() => {
    if (!drill.contentType || !drill.educationLevel) return [];
    const filtered = allDocs.filter(
      d => d.content_type === drill.contentType && (d.education_level ?? '').trim() === drill.educationLevel,
    );
    const counts: Record<string, number> = {};
    for (const doc of filtered) {
      const cl = (doc.class_level ?? '').trim() || 'Brak';
      counts[cl] = (counts[cl] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pl', { numeric: true }));
  }, [allDocs, drill.contentType, drill.educationLevel]);

  // Level 4: unique subjects for selected content_type + education_level + class_level
  const subjectGroups = React.useMemo(() => {
    if (!drill.contentType || !drill.educationLevel || !drill.classLevel) return [];
    const filtered = allDocs.filter(
      d =>
        d.content_type === drill.contentType &&
        (d.education_level ?? '').trim() === drill.educationLevel &&
        ((d.class_level ?? '').trim() || 'Brak') === drill.classLevel,
    );
    const map: Record<string, { name: string; count: number }> = {};
    for (const doc of filtered) {
      const sid = doc.subject_id;
      if (!sid) continue;
      const name = doc.subject_name || sid;
      if (!map[sid]) map[sid] = { name, count: 0 };
      map[sid].count++;
    }
    return Object.entries(map).map(([id, { name, count }]) => ({ id, name, count }));
  }, [allDocs, drill.contentType, drill.educationLevel, drill.classLevel]);

  // Level 5: actual documents for selected content_type + education_level + class_level + subject
  const visibleDocs = React.useMemo(() => {
    if (drill.level !== 'documents' || !drill.subjectId) return [];
    return allDocs.filter(
      d =>
        d.content_type === drill.contentType &&
        (d.education_level ?? '').trim() === drill.educationLevel &&
        ((d.class_level ?? '').trim() || 'Brak') === drill.classLevel &&
        d.subject_id === drill.subjectId,
    );
  }, [allDocs, drill]);

  // --- Navigation helpers ---

  const goToEducationLevels = (contentType: string) =>
    setDrill({ level: 'educationLevel', contentType });

  const goToClassLevels = (educationLevel: string, educationLevelLbl: string) =>
    setDrill({ level: 'classLevel', contentType: drill.contentType, educationLevel, educationLevelLabel: educationLevelLbl });

  const goToSubjects = (classLevel: string) =>
    setDrill({ ...drill, level: 'subject', classLevel });

  const goToDocuments = (subjectId: string, subjectName: string) =>
    setDrill({ ...drill, level: 'documents', subjectId, subjectName });

  const goTo = (level: DrillLevel) => {
    if (level === 'type') setDrill({ level: 'type' });
    else if (level === 'educationLevel') setDrill({ level: 'educationLevel', contentType: drill.contentType });
    else if (level === 'classLevel') setDrill({ level: 'classLevel', contentType: drill.contentType, educationLevel: drill.educationLevel, educationLevelLabel: drill.educationLevelLabel });
    else if (level === 'subject') setDrill({ level: 'subject', contentType: drill.contentType, educationLevel: drill.educationLevel, educationLevelLabel: drill.educationLevelLabel, classLevel: drill.classLevel });
  };

  const currentTypeLabel = CONTENT_TYPES.find(t => t.value === drill.contentType)?.label ?? drill.contentType;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Moje materiały
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/generate')}
        >
          Wygeneruj nowy
        </Button>
      </Box>

      {/* Breadcrumbs */}
      {drill.level !== 'type' && (
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link underline="hover" sx={{ cursor: 'pointer' }} onClick={() => goTo('type')}>
            Typy treści
          </Link>

          {drill.level === 'educationLevel' ? (
            <Typography color="text.primary">{currentTypeLabel}</Typography>
          ) : (
            <Link underline="hover" sx={{ cursor: 'pointer' }} onClick={() => goTo('educationLevel')}>
              {currentTypeLabel}
            </Link>
          )}

          {drill.level !== 'educationLevel' && (
            drill.level === 'classLevel' ? (
              <Typography color="text.primary">{drill.educationLevelLabel}</Typography>
            ) : (
              <Link underline="hover" sx={{ cursor: 'pointer' }} onClick={() => goTo('classLevel')}>
                {drill.educationLevelLabel}
              </Link>
            )
          )}

          {drill.level !== 'educationLevel' && drill.level !== 'classLevel' && (
            drill.level === 'subject' ? (
              <Typography color="text.primary">{drill.classLevel}</Typography>
            ) : (
              <Link underline="hover" sx={{ cursor: 'pointer' }} onClick={() => goTo('subject')}>
                {drill.classLevel}
              </Link>
            )
          )}

          {drill.level === 'documents' && (
            <Typography color="text.primary">{drill.subjectName}</Typography>
          )}
        </Breadcrumbs>
      )}

      {/* Level 1 — Content Types */}
      {drill.level === 'type' && (
        <>
          {contentTypeGroups.length === 0 ? (
            <EmptyState
              icon={<DescriptionIcon />}
              title="Brak dokumentów"
              description="Nie wygenerowałeś/aś jeszcze żadnych materiałów edukacyjnych. Przejdź do kreatora, aby zacząć!"
              actionLabel="Kreator materiałów"
              onAction={() => router.push('/generate')}
            />
          ) : (
            <Grid container spacing={3}>
              {contentTypeGroups.map((ct) => (
                <Grid item xs={12} sm={6} md={4} key={ct.value}>
                  <Card variant="outlined" sx={{ transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', boxShadow: 2 } }}>
                    <CardActionArea onClick={() => goToEducationLevels(ct.value)} sx={{ p: 3 }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Box sx={{ color: 'primary.main', mb: 2 }}>{getIconForType(ct.value)}</Box>
                        <Typography variant="h6" fontWeight="bold">{ct.label}</Typography>
                        <Chip label={`${ct.count} materiałów`} size="small" sx={{ mt: 1 }} />
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Level 2 — Education Levels */}
      {drill.level === 'educationLevel' && (
        <Grid container spacing={3}>
          {educationLevelGroups.map((el) => (
            <Grid item xs={12} sm={6} md={4} key={el.value}>
              <Card variant="outlined" sx={{ transition: 'all 0.2s', '&:hover': { borderColor: 'secondary.main', boxShadow: 2 } }}>
                <CardActionArea onClick={() => goToClassLevels(el.value, el.label)} sx={{ p: 3 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: 'secondary.main', mb: 2 }}><SchoolIcon fontSize="large" /></Box>
                    <Typography variant="h6" fontWeight="bold">{el.label}</Typography>
                    <Chip label={`${el.count} materiałów`} size="small" sx={{ mt: 1 }} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Level 3 — Class Levels */}
      {drill.level === 'classLevel' && (
        <Grid container spacing={3}>
          {classLevelGroups.map((cl) => (
            <Grid item xs={6} sm={4} md={3} key={cl.value}>
              <Card variant="outlined" sx={{ transition: 'all 0.2s', '&:hover': { borderColor: 'success.main', boxShadow: 2 } }}>
                <CardActionArea onClick={() => goToSubjects(cl.value)} sx={{ p: 3 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: 'success.main', mb: 2 }}><ClassIcon fontSize="large" /></Box>
                    <Typography variant="h6" fontWeight="bold">{cl.label}</Typography>
                    <Chip label={`${cl.count} materiałów`} size="small" sx={{ mt: 1 }} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Level 4 — Subjects */}
      {drill.level === 'subject' && (
        <Grid container spacing={3}>
          {subjectGroups.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <Card variant="outlined" sx={{ transition: 'all 0.2s', '&:hover': { borderColor: 'info.main', boxShadow: 2 }, display: 'flex', flexDirection: 'column' }}>
                <CardActionArea onClick={() => goToDocuments(s.id, s.name)} sx={{ p: 3, flexGrow: 1 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: 'info.main', mb: 2 }}><MenuBookIcon fontSize="large" /></Box>
                    <Typography variant="h6" fontWeight="bold">{s.name}</Typography>
                    <Chip label={`${s.count} materiałów`} size="small" sx={{ mt: 1 }} />
                  </CardContent>
                </CardActionArea>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, py: 0.5 }}>
                  <Tooltip title="Zarządzaj plikami źródłowymi">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => router.push(`/subjects?subjectId=${s.id}`)}
                    >
                      <FolderOpenIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary">
                    Pliki źródłowe
                  </Typography>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Level 5 — Documents */}
      {drill.level === 'documents' && (
        <>
          {visibleDocs.length === 0 ? (
            <EmptyState icon={<DescriptionIcon />} title="Brak materiałów" description="Brak materiałów dla wybranych kryteriów." />
          ) : (
            <Grid container spacing={3}>
              {visibleDocs.map((doc) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
                  <DocumentCard document={doc} onDelete={setDeleteId} />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Usuń materiał"
        message="Czy na pewno chcesz usunąć ten wygenerowany dokument? Tej operacji nie można cofnąć."
        confirmLabel="Usuń"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
