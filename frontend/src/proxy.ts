import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register'];

// Routes that should redirect authenticated users to dashboard
const AUTH_ONLY_ROUTES = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for the auth cookie (set on login, removed on logout)
  const authCookie = request.cookies.get('edugen-auth');
  const isAuthenticated = !!authCookie?.value;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // If not authenticated and trying to access a protected route → redirect to /login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access /login → redirect to /dashboard
  if (isAuthenticated && AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except Next.js internals, static files, and API routes
  // API routes are proxied directly to the backend via next.config.ts rewrites
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
