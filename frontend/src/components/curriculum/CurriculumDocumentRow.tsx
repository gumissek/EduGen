'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import { alpha, useTheme } from '@mui/material/styles';
import { CurriculumDocument } from '@/types';

const STATUS_CHIP_PROPS: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' }> = {
  uploaded: { label: 'Wgrano', color: 'default' },
  processing: { label: 'Przetwarzanie...', color: 'warning' },
  ready: { label: 'Gotowy', color: 'success' },
  error: { label: 'Błąd', color: 'error' },
};

interface CurriculumDocumentRowProps {
  document: CurriculumDocument;
  onDownload?: (docId: string, filename: string) => void;
  showDate?: boolean;
  showAdminMetadata?: boolean;
  actions?: React.ReactNode;
}

export default function CurriculumDocumentRow({
  document,
  onDownload,
  showDate = false,
  showAdminMetadata = false,
  actions,
}: CurriculumDocumentRowProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const statusProps = STATUS_CHIP_PROPS[document.status] ?? { label: document.status, color: 'default' as const };
  const hasSourceLink = Boolean(document.description?.trim());

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 1.75, md: 2 },
        borderRadius: 2,
        backgroundColor: isDark
          ? alpha(theme.palette.background.paper, 0.7)
          : alpha(theme.palette.background.paper, 0.95),
        borderColor: isDark
          ? alpha(theme.palette.common.white, 0.14)
          : alpha(theme.palette.divider, 0.8),
        backdropFilter: 'blur(6px)',
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
        '&:hover': {
          borderColor: isDark
            ? alpha(theme.palette.primary.light, 0.45)
            : alpha(theme.palette.primary.main, 0.35),
        },
      }}
    >
      <Stack spacing={1.25}>
        {/* Desktop: horizontal row; Mobile: vertical card */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
            {/* Filename with icon */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <DescriptionIcon color="primary" fontSize="small" />
              <Typography
                variant="subtitle1"
                fontWeight={600}
                title={document.original_filename}
                sx={{
                  color: 'text.primary',
                  // On mobile: wrap text; on desktop: truncate
                  overflow: { xs: 'visible', md: 'hidden' },
                  textOverflow: { md: 'ellipsis' },
                  whiteSpace: { xs: 'normal', md: 'nowrap' },
                  wordBreak: { xs: 'break-word', md: 'normal' },
                }}
              >
                {document.original_filename}
              </Typography>
            </Box>

            {/* Chips: education level, subject, status */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
              {document.education_level && (
                <Chip
                  label={document.education_level}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ borderColor: alpha(theme.palette.primary.main, isDark ? 0.55 : 0.35) }}
                />
              )}
              {document.subject_name && (
                <Chip
                  label={document.subject_name}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ borderColor: alpha(theme.palette.secondary.main, isDark ? 0.55 : 0.35) }}
                />
              )}
              {document.curriculum_year && (
                <Chip
                  label={document.curriculum_year}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: alpha(theme.palette.info.main, isDark ? 0.55 : 0.35) }}
                />
              )}
              <Chip label={statusProps.label} size="small" color={statusProps.color} />
            </Box>

            {/* Source link */}
            {hasSourceLink ? (
              <Link
                href={document.description as string}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{
                  wordBreak: 'break-all',
                  display: 'inline-block',
                  color: isDark ? theme.palette.info.light : theme.palette.info.dark,
                  fontSize: { xs: '0.8rem', md: '0.875rem' },
                }}
              >
                {document.description}
              </Link>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Brak linku źródłowego
              </Typography>
            )}

            {/* Admin metadata */}
            {showAdminMetadata && (
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Strony: {document.page_count ?? '-'} | Fragmenty (chunki): {document.chunk_count}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Utworzono: {new Date(document.created_at).toLocaleString('pl-PL')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Zaktualizowano: {new Date(document.updated_at).toLocaleString('pl-PL')}
                </Typography>
                {document.error_message && (
                  <Typography variant="caption" color="error.main" sx={{ wordBreak: 'break-word' }}>
                    Błąd: {document.error_message}
                  </Typography>
                )}
              </Stack>
            )}
          </Box>

          {/* Actions column: full-width buttons on mobile, right-aligned on desktop */}
          <Stack
            direction={{ xs: 'row', md: 'column' }}
            spacing={1}
            alignItems={{ xs: 'stretch', md: 'flex-end' }}
            justifyContent={{ xs: 'flex-start', md: 'center' }}
            sx={{
              width: { xs: '100%', md: 'auto' },
              flexWrap: 'wrap',
              mt: { xs: 1, md: 0 },
              pt: { xs: 1, md: 0 },
              borderTop: { xs: `1px solid ${alpha(theme.palette.divider, 0.5)}`, md: 'none' },
            }}
          >
            {showDate && (
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                Dodano: {new Date(document.created_at).toLocaleDateString('pl-PL')}
              </Typography>
            )}

            {onDownload && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => onDownload(document.id, document.original_filename)}
                sx={{ whiteSpace: 'nowrap', minHeight: 36, flex: { xs: 1, md: 'none' } }}
              >
                Pobierz PDF
              </Button>
            )}

            {actions}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
