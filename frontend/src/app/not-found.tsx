import { redirect } from 'next/navigation';

/**
 * Global 404 handler — redirects all unknown paths to /dashboard.
 * The authenticated layout will handle unauthenticated users and redirect to /login.
 */
export default function NotFound() {
  redirect('/dashboard');
}
