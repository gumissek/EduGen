'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import LinearProgress from '@mui/material/LinearProgress';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GavelIcon from '@mui/icons-material/Gavel';
import CloseIcon from '@mui/icons-material/Close';
import { ComplianceResult } from '@/types';

interface ComplianceSidebarProps {
  complianceData: ComplianceResult | null;
  onRunCompliance: () => Promise<void>;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  isAvailable: boolean;
}

function getSimilarityColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 0.7) return 'success';
  if (score >= 0.5) return 'warning';
  return 'error';
}

export default function ComplianceSidebar({
  complianceData,
  onRunCompliance,
  isLoading,
  isOpen,
  onToggle,
  isAvailable,
}: ComplianceSidebarProps) {
  if (!isAvailable) return null;

  const summary = complianceData?.coverage_summary;
  const progress = summary
    ? (summary.matched_questions / Math.max(summary.total_questions, 1)) * 100
    : 0;

  return (
    <>
      {/* Toggle button */}
      <Tooltip title="Zgodność z Podstawą Programową">
        <Button
          variant="outlined"
          size="small"
          startIcon={<GavelIcon />}
          onClick={onToggle}
          sx={{ minWidth: 'auto' }}
        >
          PP
        </Button>
      </Tooltip>

      {/* Sidebar drawer */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={onToggle}
        variant="persistent"
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 380 },
            p: 2,
            pt: 10,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Zgodność z Podstawą Programową
          </Typography>
          <IconButton onClick={onToggle} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {!complianceData && !isLoading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Uruchom weryfikację, aby sprawdzić zgodność pytań z Podstawą Programową.
            </Typography>
            <Button
              variant="contained"
              onClick={() => { onRunCompliance().catch(() => undefined); }}
              startIcon={<GavelIcon />}
            >
              Uruchom weryfikację
            </Button>
          </Box>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Weryfikacja zgodności...
            </Typography>
          </Box>
        )}

        {complianceData && !isLoading && (
          <>
            {/* Coverage summary */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                {summary?.matched_questions}/{summary?.total_questions} pytań powiązanych z PP
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 8, borderRadius: 4 }}
                color={progress >= 70 ? 'success' : progress >= 40 ? 'warning' : 'error'}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {summary?.unique_requirements_covered} unikalnych wymagań
              </Typography>
            </Box>

            {/* Per-question results */}
            {complianceData.questions.map((q) => (
              <Accordion key={q.question_index} disableGutters variant="outlined" sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography variant="body2" fontWeight={600}>
                      Pytanie {q.question_index + 1}
                    </Typography>
                    {q.matched_requirements.length > 0 ? (
                      <Chip
                        label={q.matched_requirements[0].requirement_code ?? 'Dopasowano'}
                        size="small"
                        color={getSimilarityColor(q.matched_requirements[0].similarity_score)}
                      />
                    ) : (
                      <Chip label="Brak" size="small" color="default" />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    {q.question_text}
                  </Typography>
                  {q.matched_requirements.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Nie znaleziono powiązania z Podstawą Programową.
                    </Typography>
                  )}
                  {q.matched_requirements.map((req, rIdx) => (
                    <Box key={rIdx} sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" fontWeight={600}>
                          {req.requirement_code ?? req.section_title ?? 'Wymaganie'}
                        </Typography>
                        <Chip
                          label={`${(req.similarity_score * 100).toFixed(0)}%`}
                          size="small"
                          color={getSimilarityColor(req.similarity_score)}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {req.requirement_text.substring(0, 200)}
                        {req.requirement_text.length > 200 ? '...' : ''}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Źródło: {req.document_name}
                      </Typography>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}

            {/* Re-run button */}
            <Button
              variant="outlined"
              size="small"
              onClick={() => { onRunCompliance().catch(() => undefined); }}
              startIcon={<GavelIcon />}
              fullWidth
              sx={{ mt: 2 }}
            >
              Uruchom ponownie
            </Button>
          </>
        )}
      </Drawer>
    </>
  );
}
