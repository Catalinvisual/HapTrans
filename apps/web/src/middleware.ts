import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public paths
  const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout'];
  const isPublic = publicPaths.some(p => path.startsWith(p));
  
  if (isPublic) {
    return NextResponse.next();
  }
  
  const accessToken = request.cookies.get('access_token')?.value;
  console.log(`[MIDDLEWARE] path=${path} hasAccessToken=${!!accessToken}`);
  
  if (!accessToken && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (accessToken && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
