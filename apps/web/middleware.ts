import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
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

  // Redirect authenticated users away from auth pages to /dashboard
  if (path.startsWith('/auth/')) {
    // Avoid redirecting on the callback route itself so the auth exchange can run
    if (path !== '/auth/callback' && user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
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
