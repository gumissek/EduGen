'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordRequestSchema, ChangePasswordRequest } from '@/schemas/auth';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordRequest>({
    resolver: zodResolver(ChangePasswordRequestSchema),
  });

  const onSubmit = async (data: ChangePasswordRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await changePassword(data.new_password);
      router.push('/dashboard');
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Nie udało się zmienić hasła. Spróbuj ponownie.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%', mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TextField
        margin="normal"
        required
        fullWidth
        label="Nowe hasło"
        type="password"
        autoFocus
        error={!!errors.new_password}
        helperText={errors.new_password?.message}
        {...register('new_password')}
        disabled={isLoading}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        label="Potwierdź nowe hasło"
        type="password"
        error={!!errors.confirm_password}
        helperText={errors.confirm_password?.message}
        {...register('confirm_password')}
        disabled={isLoading}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2, height: 48 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Zmień hasło'}
      </Button>
    </Box>
  );
}
