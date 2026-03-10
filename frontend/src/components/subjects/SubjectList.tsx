'use client';

import * as React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box'
import { Subject } from '@/types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface SubjectListProps {
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function SubjectList({ subjects, selectedSubjectId, onSelect, onDelete }: SubjectListProps) {
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (subjects.length === 0) {
    return <Typography variant="body2" color="text.secondary" p={2}>Brak przedmiotów.</Typography>;
  }

  return (
    <>
      <List sx={{ width: '100%', bgcolor: 'transparent', display: 'flex', flexDirection: 'column', gap: 1.5, p: 0 }}>
        {subjects.map((subject) => {
          const isSelected = selectedSubjectId === subject.id;
          return (
          <ListItem
            key={subject.id}
            disablePadding
            secondaryAction={
              subject.is_custom ? (
                <IconButton edge="end" aria-label="delete" onClick={() => setDeleteId(subject.id)} sx={{ mr: 1, color: 'error.main' }}>
                  <DeleteIcon />
                </IconButton>
              ) : null
            }
            sx={{
              border: '1px solid',
              borderColor: isSelected ? 'primary.main' : 'divider',
              borderRadius: '16px',
              bgcolor: 'background.paper',
              backgroundImage: isSelected ? 'linear-gradient(to right, rgba(1, 72, 131, 0.03), transparent)' : 'none',
              boxShadow: isSelected ? '0 4px 12px rgba(1, 72, 131, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundImage: 'linear-gradient(to right, rgba(1, 72, 131, 0.04), transparent)',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(1, 72, 131, 0.1)'
              }
            }}
          >
            <ListItemButton
              selected={isSelected}
              onClick={() => onSelect(subject.id)}
              sx={{ p: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 48, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                <Box sx={{ p: 1, bgcolor: isSelected ? 'rgba(1, 72, 131, 0.1)' : 'rgba(0, 0, 0, 0.04)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderIcon color="inherit" />
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary={subject.name} 
                primaryTypographyProps={{ 
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'primary.main' : 'text.primary',
                }} 
              />
            </ListItemButton>
          </ListItem>
        )})}
      </List>

      <ConfirmDialog
        open={!!deleteId}
        title="Usuń przedmiot"
        message="Czy na pewno chcesz usunąć ten przedmiot? Spowoduje to również usunięcie powiązanych z nim plików źródłowych."
        confirmLabel="Usuń"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
