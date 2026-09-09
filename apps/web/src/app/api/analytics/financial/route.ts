import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const target = `${API_BASE}/api/v1/analytics/financial${url.search}`;
  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  try {
    const res = await fetch(target, { method: 'GET', headers, credentials: 'include' });
    const responseHeaders = new Headers(res.headers);
    responseHeaders.delete('set-cookie');
    return new NextResponse(res.body, { status: res.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}