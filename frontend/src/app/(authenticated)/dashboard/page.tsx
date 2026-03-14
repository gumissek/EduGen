'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid2 from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GradingIcon from '@mui/icons-material/Grading';
import QuizIcon from '@mui/icons-material/Quiz';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import ClassIcon from '@mui/icons-material/Class';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
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

interface DraftListResponse {
  prototypes: DraftMaterial[];
  total: number;
}

interface DraftMaterial {
  id: string;
  generation_id: string;
  subject_id: string;
  subject_name: string;
  title: string;
  content_type: string;
  education_level: string;
  class_level: string;
  created_at: string;
  updated_at: string;
}

interface DrillMaterial {
  id: string;
  generation_id: string;
  subject_id: string;
  subject_name: string;
  title: string;
  content_type: string;
  education_level: string;
  class_level: string;
}

type MaterialSection = 'ready' | 'drafts';

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
  const [section, setSection] = React.useState<MaterialSection>('ready');
  const [readyDrill, setReadyDrill] = React.useState<DrillState>({ level: 'type' });
  const [draftDrill, setDraftDrill] = React.useState<DrillState>({ level: 'type' });
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteDraftGenerationId, setDeleteDraftGenerationId] = React.useState<string | null>(null);

  const drill = section === 'ready' ? readyDrill : draftDrill;
  const setDrill = section === 'ready' ? setReadyDrill : setDraftDrill;

  // Ready materials
  const { data: docsData, isLoading } = useQuery<Document[]>({
    queryKey: ['documents', 'all'],
    queryFn: async () => {
      const res = await api.get<DocumentListResponse>('/api/documents?per_page=1000');
      return res.data.documents;
    },
  });

  // Draft materials
  const { data: draftsData, isLoading: isLoadingDrafts } = useQuery<DraftMaterial[]>({
    queryKey: ['prototypes', 'all-drafts'],
    queryFn: async () => {
      const res = await api.get<DraftListResponse>('/api/prototypes');
      return res.data.prototypes;
    },
  });

  const allDocs: Document[] = React.useMemo(() => docsData ?? [], [docsData]);
  const allDrafts: DraftMaterial[] = React.useMemo(() => draftsData ?? [], [draftsData]);

  const activeMaterials = React.useMemo<DrillMaterial[]>(() => {
    if (section === 'ready') {
      return allDocs.map((d) => ({
        id: d.id,
        generation_id: d.generation_id,
        subject_id: d.subject_id,
        subject_name: d.subject_name ?? '',
        title: d.title,
        content_type: d.content_type,
        education_level: d.education_level ?? '',
        class_level: d.class_level ?? '',
      }));
    }
    return allDrafts.map((d) => ({
      id: d.id,
      generation_id: d.generation_id,
      subject_id: d.subject_id,
      subject_name: d.subject_name,
      title: d.title,
      content_type: d.content_type,
      education_level: d.education_level,
      class_level: d.class_level,
    }));
  }, [section, allDocs, allDrafts]);

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

  const copyDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/documents/${id}/copy`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      success('Utworzono kopię dokumentu');
    },
    onError: () => error('Błąd podczas kopiowania dokumentu'),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (generationId: string) => {
      await api.delete(`/api/prototypes/${generationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototypes', 'all-drafts'] });
      success('Wersja robocza została usunięta');
    },
    onError: () => error('Błąd podczas usuwania wersji roboczej'),
  });

  const handleDeleteDraftConfirm = () => {
    if (deleteDraftGenerationId) {
      deleteDraftMutation.mutate(deleteDraftGenerationId);
      setDeleteDraftGenerationId(null);
    }
  };

  const copyDraftMutation = useMutation({
    mutationFn: async (generationId: string) => {
      await api.post(`/api/prototypes/${generationId}/copy`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototypes', 'all-drafts'] });
      success('Utworzono kopię wersji roboczej');
    },
    onError: () => error('Błąd podczas kopiowania wersji roboczej'),
  });

  // --- Derived data for each drill level ---

  // Level 1: unique content types that have at least 1 document
  const contentTypeGroups = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of activeMaterials) {
      const ct = item.content_type || '';
      if (ct) counts[ct] = (counts[ct] || 0) + 1;
    }
    const known = CONTENT_TYPES.filter(t => counts[t.value]).map(t => ({ ...t, count: counts[t.value] }));
    const knownValues = new Set(CONTENT_TYPES.map(t => t.value) as readonly string[]);
    const unknown = Object.entries(counts)
      .filter(([v]) => !knownValues.has(v))
      .map(([v, count]) => ({ value: v, label: v, count }));
    return [...known, ...unknown];
  }, [activeMaterials]);

  // Level 2: unique education levels for selected content_type
  const educationLevelGroups = React.useMemo(() => {
    if (!drill.contentType) return [];
    const filtered = activeMaterials.filter(d => d.content_type === drill.contentType);
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
  }, [activeMaterials, drill.contentType]);

  // Level 3: unique class levels for selected content_type + education_level
  const classLevelGroups = React.useMemo(() => {
    if (!drill.contentType || !drill.educationLevel) return [];
    const filtered = activeMaterials.filter(
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
  }, [activeMaterials, drill.contentType, drill.educationLevel]);

  // Level 4: unique subjects for selected content_type + education_level + class_level
  const subjectGroups = React.useMemo(() => {
    if (!drill.contentType || !drill.educationLevel || !drill.classLevel) return [];
    const filtered = activeMaterials.filter(
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
  }, [activeMaterials, drill.contentType, drill.educationLevel, drill.classLevel]);

  // Level 5: actual documents for selected content_type + education_level + class_level + subject
  const visibleDocs = React.useMemo(() => {
    if (section !== 'ready' || drill.level !== 'documents' || !drill.subjectId) return [];
    return allDocs.filter(
      d =>
        d.content_type === drill.contentType &&
        (d.education_level ?? '').trim() === drill.educationLevel &&
        ((d.class_level ?? '').trim() || 'Brak') === drill.classLevel &&
        d.subject_id === drill.subjectId,
    );
  }, [allDocs, drill, section]);

  const visibleDrafts = React.useMemo(() => {
    if (section !== 'drafts' || drill.level !== 'documents' || !drill.subjectId) return [];
    return allDrafts.filter(
      d =>
        d.content_type === drill.contentType &&
        (d.education_level ?? '').trim() === drill.educationLevel &&
        ((d.class_level ?? '').trim() || 'Brak') === drill.classLevel &&
        d.subject_id === drill.subjectId,
    );
  }, [allDrafts, drill, section]);

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

  if (isLoading || isLoadingDrafts) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }} color='text.primary'>
          Moje materiały
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/generate')}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Wygeneruj nowy
        </Button>
      </Box>

      <Tabs
        value={section}
        onChange={(_, value: MaterialSection) => setSection(value)}
        sx={{ mb: 3 }}
      >
        <Tab value="ready" label="Gotowe materiały" />
        <Tab value="drafts" label="Wersje robocze" />
      </Tabs>

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
              title={section === 'ready' ? 'Brak dokumentów' : 'Brak wersji roboczych'}
              description={
                section === 'ready'
                  ? 'Nie wygenerowałeś/aś jeszcze żadnych materiałów edukacyjnych. Przejdź do kreatora, aby zacząć!'
                  : 'Nie masz jeszcze zapisanych wersji roboczych. Zapisz prototyp w edytorze, aby pojawił się tutaj.'
              }
              actionLabel="Kreator materiałów"
              onAction={() => router.push('/generate')}
            />
          ) : (
            <Grid2 container spacing={3}>
              {contentTypeGroups.map((ct) => (
                <Grid2 size={{xs:12, sm:6, md:4, lg:3}} key={ct.value}>
                  <Card variant="outlined" sx={{ height: '100%', borderColor: 'divider', borderWidth: '2px', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(1, 72, 131, 0.02)' } }}>
                    <CardActionArea onClick={() => goToEducationLevels(ct.value)} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                      <CardContent sx={{ textAlign: 'left', p: 0, width: '100%' }}>
                        <Box sx={{ color: 'primary.main', mb: 2, bgcolor: 'rgba(1, 72, 131, 0.08)', width: 56, height: 56, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getIconForType(ct.value)}
                        </Box>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>{ct.label}</Typography>
                        <Chip label={`${ct.count} materiałów`} size="small" variant="outlined" color="primary" />
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid2>
              ))}
            </Grid2>
          )}
        </>
      )}

      {/* Level 2 — Education Levels */}
      {drill.level === 'educationLevel' && (
        <Grid2 container spacing={3}>
          {educationLevelGroups.map((el) => (
            <Grid2 size={{xs:12, sm:6, md:4, lg:3}} key={el.value}>
              <Card variant="outlined" sx={{ height: '100%', borderColor: 'divider', borderWidth: '2px', transition: 'all 0.2s', '&:hover': { borderColor: 'secondary.main', bgcolor: 'rgba(33, 174, 76, 0.02)' } }}>
                <CardActionArea onClick={() => goToClassLevels(el.value, el.label)} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                  <CardContent sx={{ textAlign: 'left', p: 0, width: '100%' }}>
                    <Box sx={{ color: 'secondary.main', mb: 2, bgcolor: 'rgba(33, 174, 76, 0.08)', width: 56, height: 56, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SchoolIcon fontSize="medium" />
                    </Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>{el.label}</Typography>
                    <Chip label={`${el.count} materiałów`} size="small" variant="outlined" color="secondary" />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      )}

      {/* Level 3 — Class Levels */}
      {drill.level === 'classLevel' && (
        <Grid2 container spacing={3}>
          {classLevelGroups.map((cl) => (
            <Grid2 size={{xs:12, sm:6, md:4, lg:3}} key={cl.value}>
              <Card variant="outlined" sx={{ height: '100%', borderColor: 'divider', borderWidth: '2px', transition: 'all 0.2s', '&:hover': { borderColor: 'success.main', bgcolor: 'rgba(33, 174, 76, 0.02)' } }}>
                <CardActionArea onClick={() => goToSubjects(cl.value)} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                  <CardContent sx={{ textAlign: 'left', p: 0, width: '100%' }}>
                    <Box sx={{ color: 'success.main', mb: 2, bgcolor: 'rgba(33, 174, 76, 0.08)', width: 56, height: 56, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ClassIcon fontSize="medium" />
                    </Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>{cl.label}</Typography>
                    <Chip label={`${cl.count} materiałów`} size="small" variant="outlined" color="success" />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      )}

      {/* Level 4 — Subjects */}
      {drill.level === 'subject' && (
        <Grid2 container spacing={3}>
          {subjectGroups.map((s) => (
            <Grid2 size={{xs:12, sm:6, md:4, lg:3}} key={s.id}>
              <Card variant="outlined" sx={{ height: '100%', borderColor: 'divider', borderWidth: '2px', transition: 'all 0.2s', '&:hover': { borderColor: 'info.main', bgcolor: 'rgba(2, 136, 209, 0.02)' }, display: 'flex', flexDirection: 'column' }}>
                <CardActionArea onClick={() => goToDocuments(s.id, s.name)} sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                  <CardContent sx={{ textAlign: 'left', p: 0, width: '100%' }}>
                    <Box sx={{ color: 'info.main', mb: 2, bgcolor: 'rgba(2, 136, 209, 0.08)', width: 56, height: 56, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MenuBookIcon fontSize="medium" />
                    </Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, wordBreak: 'break-word' }}>{s.name}</Typography>
                    <Chip label={`${s.count} materiałów`} size="small" variant="outlined" color="info" />
                  </CardContent>
                </CardActionArea>
                <Divider />
                <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Baza wiedzy
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {/* <Tooltip title="Kopiuj listę plików źródłowych">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => copySubjectFiles(s.id, s.name)}
                        sx={{ bgcolor: 'rgba(2, 136, 209, 0.08)', '&:hover': { bgcolor: 'rgba(2, 136, 209, 0.16)' } }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip> */}
                    <Tooltip title="Zarządzaj plikami źródłowymi">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => router.push(`/subjects?subjectId=${s.id}`)}
                        sx={{ bgcolor: 'rgba(2, 136, 209, 0.08)', '&:hover': { bgcolor: 'rgba(2, 136, 209, 0.16)' } }}
                      >
                        <FolderOpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      )}

      {/* Level 5 — Documents */}
      {section === 'ready' && drill.level === 'documents' && (
        <>
          {visibleDocs.length === 0 ? (
            <EmptyState icon={<DescriptionIcon />} title="Brak materiałów" description="Brak materiałów dla wybranych kryteriów." />
          ) : (
            <Grid2 container spacing={3}>
              {visibleDocs.map((doc) => (
                <Grid2 size={{xs:12, sm:6, md:4, lg:3}} key={doc.id}>
                  <DocumentCard document={doc} onDelete={setDeleteId} onCopy={(id) => copyDocumentMutation.mutate(id)} />
                </Grid2>
              ))}
            </Grid2>
          )}
        </>
      )}

      {/* Level 5 — Drafts */}
      {section === 'drafts' && drill.level === 'documents' && (
        <>
          {visibleDrafts.length === 0 ? (
            <EmptyState icon={<EditNoteIcon />} title="Brak wersji roboczych" description="Brak zapisanych wersji roboczych dla wybranych kryteriów." />
          ) : (
            <Grid2 container spacing={3}>
              {visibleDrafts.map((draft) => (
                <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={draft.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      borderWidth: '1px',
                      borderColor: 'divider',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        borderColor: 'secondary.main',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.08)'
                      }
                    }}
                  >
                    <CardActionArea
                      onClick={() => router.push(`/generate/${draft.generation_id}/editor`)}
                      sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                          <Box
                            sx={{
                              color: 'secondary.main',
                              mr: 2,
                              bgcolor: 'rgba(156, 39, 176, 0.08)',
                              width: 48,
                              height: 48,
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <EditNoteIcon />
                          </Box>
                          <Box>
                            <Typography
                              variant="h6"
                              component="div"
                              sx={{
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                lineHeight: 1.3,
                                mb: 0.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {draft.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                              Ostatnia edycja: {new Date(draft.updated_at).toLocaleString('pl-PL')}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip label="Wersja robocza" size="small" color="secondary" variant="outlined" />
                        </Box>
                      </CardContent>
                    </CardActionArea>
                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2, pt: 0 }}>
                      <IconButton
                        size="small"
                        color="primary"
                        title="Utwórz kopię wersji roboczej"
                        onClick={(event) => {
                          event.stopPropagation();
                          copyDraftMutation.mutate(draft.generation_id);
                        }}
                        sx={{ bgcolor: 'rgba(1, 72, 131, 0.08)', '&:hover': { bgcolor: 'rgba(1, 72, 131, 0.16)' } }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        title="Usuń wersję roboczą"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteDraftGenerationId(draft.generation_id);
                        }}
                        sx={{ bgcolor: 'rgba(229, 57, 53, 0.08)', '&:hover': { bgcolor: 'rgba(229, 57, 53, 0.16)' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid2>
              ))}
            </Grid2>
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

      <ConfirmDialog
        open={!!deleteDraftGenerationId}
        title="Usuń wersję roboczą"
        message="Czy na pewno chcesz usunąć tę wersję roboczą? Tej operacji nie można cofnąć."
        confirmLabel="Usuń"
        severity="error"
        isLoading={deleteDraftMutation.isPending}
        onConfirm={handleDeleteDraftConfirm}
        onCancel={() => setDeleteDraftGenerationId(null)}
      />
    </Box>
  );
}
