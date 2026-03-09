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
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {subjects.map((subject) => (
          <ListItem
            key={subject.id}
            disablePadding
            secondaryAction={
              subject.is_custom ? (
                <IconButton edge="end" aria-label="delete" onClick={() => setDeleteId(subject.id)}>
                  <DeleteIcon />
                </IconButton>
              ) : null
            }
          >
            <ListItemButton
              selected={selectedSubjectId === subject.id}
              onClick={() => onSelect(subject.id)}
            >
              <ListItemIcon>
                <FolderIcon color={selectedSubjectId === subject.id ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText 
                primary={subject.name} 
                primaryTypographyProps={{ 
                  fontWeight: selectedSubjectId === subject.id ? 'bold' : 'normal',
                  color: selectedSubjectId === subject.id ? 'primary.main' : 'text.primary',
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
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
