'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { CONTENT_TYPES } from '@/lib/constants';
import { GenerationParamsForm } from '@/schemas/generation';
import DescriptionIcon from '@mui/icons-material/Description';
import QuizIcon from '@mui/icons-material/Quiz';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GradingIcon from '@mui/icons-material/Grading';
import MenuBookIcon from '@mui/icons-material/MenuBook';

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

export default function StepContentType() {
  const { watch, setValue, formState: { errors } } = useFormContext<GenerationParamsForm>();
  const selectedType = watch('content_type');

  return (
    <>
      <Typography variant="h6" gutterBottom>Wybierz typ materiału do wygenerowania</Typography>
      {errors.content_type && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {errors.content_type.message}
        </Typography>
      )}
      
      {/* Zamieniono MUI Grid na natywny CSS Grid via Box (brak problemu z ujemnymi marginesami) */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
          gap: { xs: 2, sm: 3 }, 
          mt: 2 
        }}
      >
        {CONTENT_TYPES.map((type) => (
          <Card 
            key={type.value}
            variant="outlined" 
            sx={{ 
              height: '100%',
              borderColor: selectedType === type.value ? 'primary.main' : 'divider',
              borderWidth: '1px',
              bgcolor: 'background.paper',
              backgroundImage: selectedType === type.value ? 'linear-gradient(135deg, rgba(1, 72, 131, 0.06), transparent)' : 'none',
              boxShadow: selectedType === type.value ? '0 8px 24px rgba(1, 72, 131, 0.12)' : '0 4px 12px rgba(0,0,0,0.03)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundImage: selectedType === type.value 
                  ? 'linear-gradient(135deg, rgba(1, 72, 131, 0.08), transparent)' 
                  : 'linear-gradient(135deg, rgba(1, 72, 131, 0.02), transparent)',
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 32px rgba(1, 72, 131, 0.15)'
              }
            }}
          >
            <CardActionArea 
              onClick={() => setValue('content_type', type.value as "worksheet" | "test" | "quiz" | "exam" | "lesson_materials")}
              sx={{ height: '100%', p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              <CardContent sx={{ textAlign: 'center', p: 0, width: '100%' }}>
                <Box sx={{ 
                  color: selectedType === type.value ? 'primary.main' : 'text.secondary', 
                  mb: { xs: 1.5, sm: 2 },
                  bgcolor: selectedType === type.value ? 'rgba(1, 72, 131, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                  width: { xs: 60, sm: 72 },
                  height: { xs: 60, sm: 72 },
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  transition: 'all 0.2s ease-in-out'
                }}>
                  {getIconForType(type.value)}
                </Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 600, fontSize: { xs: '1.1rem', sm: '1.25rem' }, color: selectedType === type.value ? 'primary.main' : 'text.primary' }}>
                  {type.label}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </>
  );
}