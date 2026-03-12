'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useForm as useRHForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequestSchema, LoginRequest } from '@/schemas/auth';
import { useAuth } from '@/hooks/useAuth';

export default function LoginForm() {
  const { login, isLoading, error } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useRHForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
  });

  const onSubmit = (data: LoginRequest) => {
    login(data);
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
        id="email"
        label="Adres e-mail"
        type="email"
        autoComplete="email"
        autoFocus
        error={!!errors.email}
        helperText={errors.email?.message}
        {...register('email')}
        disabled={isLoading}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        id="password"
        label="Hasło"
        type="password"
        autoComplete="current-password"
        error={!!errors.password}
        helperText={errors.password?.message}
        {...register('password')}
        disabled={isLoading}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 1, height: 52, fontSize: '1rem', fontWeight: 600 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Zaloguj się'}
      </Button>
    </Box>
  );
}
