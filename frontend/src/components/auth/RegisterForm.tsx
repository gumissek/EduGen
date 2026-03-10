'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useForm as useRHForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterRequestSchema, RegisterRequest } from '@/schemas/auth';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterForm() {
  const { register: registerUser, isLoading, error } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useRHForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequestSchema),
  });

  const onSubmit = (data: RegisterRequest) => {
    registerUser(data);
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
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          margin="normal"
          fullWidth
          id="first_name"
          label="Imię"
          autoComplete="given-name"
          error={!!errors.first_name}
          helperText={errors.first_name?.message}
          {...register('first_name')}
          disabled={isLoading}
        />
        <TextField
          margin="normal"
          fullWidth
          id="last_name"
          label="Nazwisko"
          autoComplete="family-name"
          error={!!errors.last_name}
          helperText={errors.last_name?.message}
          {...register('last_name')}
          disabled={isLoading}
        />
      </Box>
      <TextField
        margin="normal"
        required
        fullWidth
        id="password"
        label="Hasło"
        type="password"
        autoComplete="new-password"
        error={!!errors.password}
        helperText={errors.password?.message}
        {...register('password')}
        disabled={isLoading}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        id="confirm_password"
        label="Potwierdź hasło"
        type="password"
        autoComplete="new-password"
        error={!!errors.confirm_password}
        helperText={errors.confirm_password?.message}
        {...register('confirm_password')}
        disabled={isLoading}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 1, height: 52, fontSize: '1rem', fontWeight: 600 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Zarejestruj się'}
      </Button>
    </Box>
  );
}
