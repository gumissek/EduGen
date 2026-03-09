'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import { SourceFile } from '@/types';
import FileCard from './FileCard';
import EmptyState from '@/components/ui/EmptyState';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface FileListProps {
  files: SourceFile[];
  onDelete: (id: string) => void;
}

export default function FileList({ files, onDelete }: FileListProps) {
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (files.length === 0) {
    return (
      <EmptyState
        icon={<FileCopyIcon />}
        title="Brak plików"
        description="Ten przedmiot nie ma jeszcze przypisanych żadnych materiałów źródłowych. Prześlij plik powyżej, aby zacząć."
      />
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {files.map((file) => (
          <Grid item xs={12} sm={6} md={4} key={file.id}>
            <FileCard file={file} onDelete={setDeleteId} />
          </Grid>
        ))}
      </Grid>
      
      <ConfirmDialog
        open={!!deleteId}
        title="Usuń plik"
        message="Czy na pewno chcesz usunąć ten plik z bazy? Nie będzie można go użyć do przyszłych generacji."
        confirmLabel="Usuń"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
