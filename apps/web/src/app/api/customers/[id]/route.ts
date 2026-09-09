import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function proxy(request: NextRequest, path: string[]) {
  const url = new URL(request.url);
  const target = `${API_BASE}/api/v1/${path.join('/')}${url.search}`;
  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const init: RequestInit = {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method.toUpperCase())
      ? undefined
      : await request.text(),
    credentials: 'include',
  };
  try {
    const res = await fetch(target, init);
    const responseHeaders = new Headers(res.headers);
    responseHeaders.delete('set-cookie');
    return new NextResponse(res.body, { status: res.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxy(request, ['customers', id]);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxy(request, ['customers', id]);
}