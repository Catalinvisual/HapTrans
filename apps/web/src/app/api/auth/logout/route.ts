import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  await fetch(`${apiUrl}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.set('access_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' });
  response.cookies.set('refresh_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' });
  
  return response;
}
