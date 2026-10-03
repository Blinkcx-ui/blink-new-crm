import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('USER_SESSION')?.value;
  const path = request.nextUrl.pathname;

  const isLoginPage = path.startsWith('/login');
  const isApiRoute = path.startsWith('/api');

  // If the user has no session and isn't already on the login or API route, redirect to login
  if (!session && !isLoginPage && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If a logged-in user tries to visit the login page, redirect them to the dashboard
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Apply middleware to all routes except Next.js static files and images
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};