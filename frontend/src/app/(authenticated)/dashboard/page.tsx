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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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

type DrillLevel = 'type' | 'subject' | 'education' | 'class' | 'documents';

interface DrillState {
  level: DrillLevel;
  contentType?: string;
  subjectId?: string;
  subjectName?: string;
  educationLevel?: string;
  classLevel?: number;
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
    for (const doc of allDocs) counts[doc.content_type] = (counts[doc.content_type] || 0) + 1;
    return CONTENT_TYPES.filter(t => counts[t.value]).map(t => ({ ...t, count: counts[t.value] }));
  }, [allDocs]);

  // Level 2: subjects for selected content_type
  const subjectGroups = React.useMemo(() => {
    if (!drill.contentType) return [];
    const filtered = allDocs.filter(d => d.content_type === drill.contentType);
    const map: Record<string, { name: string; count: number }> = {};
    for (const doc of filtered) {
      const sid = doc.subject_id;
      const name = doc.subject_name || sid;
      if (!map[sid]) map[sid] = { name, count: 0 };
      map[sid].count++;
    }
    return Object.entries(map).map(([id, { name, count }]) => ({ id, name, count }));
  }, [allDocs, drill.contentType]);

  // Level 3: education levels for selected content_type + subject
  const educationGroups = React.useMemo(() => {
    if (!drill.contentType || !drill.subjectId) return [];
    const filtered = allDocs.filter(
      d => d.content_type === drill.contentType && d.subject_id === drill.subjectId,
    );
    const counts: Record<string, number> = {};
    for (const doc of filtered) {
      const el = doc.education_level || 'primary';
      counts[el] = (counts[el] || 0) + 1;
    }
    return EDUCATION_LEVELS.filter(el => counts[el.value]).map(el => ({ ...el, count: counts[el.value] }));
  }, [allDocs, drill.contentType, drill.subjectId]);

  // Level 4: class levels for selected content_type + subject + education_level
  const classGroups = React.useMemo(() => {
    if (!drill.contentType || !drill.subjectId || !drill.educationLevel) return [];
    const filtered = allDocs.filter(
      d =>
        d.content_type === drill.contentType &&
        d.subject_id === drill.subjectId &&
        (d.education_level || 'primary') === drill.educationLevel,
    );
    const counts: Record<number, number> = {};
    for (const doc of filtered) counts[doc.class_level ?? 0] = (counts[doc.class_level ?? 0] || 0) + 1;
    return Object.entries(counts)
      .map(([cl, count]) => ({ classLevel: Number(cl), count }))
      .sort((a, b) => a.classLevel - b.classLevel);
  }, [allDocs, drill.contentType, drill.subjectId, drill.educationLevel]);

  // Level 5: actual documents
  const visibleDocs = React.useMemo(() => {
    if (drill.level !== 'documents') return [];
    return allDocs.filter(
      d =>
        d.content_type === drill.contentType &&
        d.subject_id === drill.subjectId &&
        (d.education_level || 'primary') === drill.educationLevel &&
        (d.class_level ?? 0) === drill.classLevel,
    );
  }, [allDocs, drill]);

  // --- Navigation helpers ---

  const goToSubjects = (contentType: string) =>
    setDrill({ level: 'subject', contentType });

  const goToEducation = (subjectId: string, subjectName: string) =>
    setDrill({ ...drill, level: 'education', subjectId, subjectName });

  const goToClasses = (educationLevel: string) =>
    setDrill({ ...drill, level: 'class', educationLevel });

  const goToDocuments = (classLevel: number) =>
    setDrill({ ...drill, level: 'documents', classLevel });

  const goTo = (level: DrillLevel) => {
    if (level === 'type') setDrill({ level: 'type' });
    else if (level === 'subject') setDrill({ level: 'subject', contentType: drill.contentType });
    else if (level === 'education') setDrill({ level: 'education', contentType: drill.contentType, subjectId: drill.subjectId, subjectName: drill.subjectName });
    else if (level === 'class') setDrill({ level: 'class', contentType: drill.contentType, subjectId: drill.subjectId, subjectName: drill.subjectName, educationLevel: drill.educationLevel });
  };

  const currentTypeLabel = CONTENT_TYPES.find(t => t.value === drill.contentType)?.label;
  const currentEducationLabel = EDUCATION_LEVELS.find(e => e.value === drill.educationLevel)?.label;

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
          {drill.level === 'subject' ? (
            <Typography color="text.primary">{currentTypeLabel}</Typography>
          ) : (
            <Link underline="hover" sx={{ cursor: 'pointer' }} onClick={() => goTo('subject')}>
              {currentTypeLabel}
            </Link>
          )}
          {drill.level !== 'subject' && (
            drill.level === 'education' ? (
              <Typography color="text.primary">{drill.subjectName}</Typography>
            ) : (
              <Link underline="hover" sx={{ cursor: 'pointer' }} onClick={() => goTo('education')}>
                {drill.subjectName}
              </Link>
            )
          )}
          {(drill.level === 'class' || drill.level === 'documents') && (
            drill.level === 'class' ? (
              <Typography color="text.primary">{currentEducationLabel}</Typography>
            ) : (
              <Link underline="hover" sx={{ cursor: 'pointer' }} onClick={() => goTo('class')}>
                {currentEducationLabel}
              </Link>
            )
          )}
          {drill.level === 'documents' && (
            <Typography color="text.primary">Klasa {drill.classLevel}</Typography>
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
                    <CardActionArea onClick={() => goToSubjects(ct.value)} sx={{ p: 3 }}>
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

      {/* Level 2 — Subjects */}
      {drill.level === 'subject' && (
        <Grid container spacing={3}>
          {subjectGroups.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <Card variant="outlined" sx={{ transition: 'all 0.2s', '&:hover': { borderColor: 'secondary.main', boxShadow: 2 }, display: 'flex', flexDirection: 'column' }}>
                <CardActionArea onClick={() => goToEducation(s.id, s.name)} sx={{ p: 3, flexGrow: 1 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: 'secondary.main', mb: 2 }}><SchoolIcon fontSize="large" /></Box>
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

      {/* Level 3 — Education levels */}
      {drill.level === 'education' && (
        <Grid container spacing={3}>
          {educationGroups.map((el) => (
            <Grid item xs={12} sm={6} key={el.value}>
              <Card variant="outlined" sx={{ transition: 'all 0.2s', '&:hover': { borderColor: 'warning.main', boxShadow: 2 } }}>
                <CardActionArea onClick={() => goToClasses(el.value)} sx={{ p: 3 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: 'warning.main', mb: 2 }}><SchoolIcon fontSize="large" /></Box>
                    <Typography variant="h6" fontWeight="bold">{el.label}</Typography>
                    <Chip label={`${el.count} materiałów`} size="small" sx={{ mt: 1 }} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Level 4 — Classes */}
      {drill.level === 'class' && (
        <Grid container spacing={3}>
          {classGroups.map((cg) => (
            <Grid item xs={6} sm={4} md={3} key={cg.classLevel}>
              <Card variant="outlined" sx={{ transition: 'all 0.2s', '&:hover': { borderColor: 'success.main', boxShadow: 2 } }}>
                <CardActionArea onClick={() => goToDocuments(cg.classLevel)} sx={{ p: 3 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: 'success.main', mb: 2 }}><ClassIcon fontSize="large" /></Box>
                    <Typography variant="h5" fontWeight="bold">Klasa {cg.classLevel}</Typography>
                    <Chip label={`${cg.count} materiałów`} size="small" sx={{ mt: 1 }} />
                  </CardContent>
                </CardActionArea>
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
