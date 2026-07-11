import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const isAllowed = origin === 'https://www.linkedin.com' || origin.startsWith('chrome-extension://');
  const corsOrigin = isAllowed ? origin : 'https://www.linkedin.com';

  // 1. Handle CORS preflight OPTIONS requests immediately
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
      },
    });
  }

  const { user, response } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Protect /dashboard and all its subroutes
  if (path.startsWith('/dashboard')) {
    if (!user) {
      // Redirect to sign-in page if not logged in
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/auth/sign-in';
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Protect /admin routes — require authenticated user
  // (admin role check is done in the admin layout component)
  if (path.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/auth/sign-in';
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect authenticated users away from auth pages to /dashboard
  if (path.startsWith('/auth/')) {
    // Avoid redirecting on the callback route itself so the auth exchange can run
    if (path !== '/auth/callback' && user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Inject CORS headers to all API responses dynamically
  if (path.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', corsOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, svgs, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
