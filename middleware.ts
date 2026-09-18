import { NextRequest, NextResponse } from 'next/server';

// This is deliberately NOT a full auth system (no signup, no
// sessions, no user table) — it's a lock on the dashboard door so
// the "authority-only" claim in the pitch is actually true, while
// still being buildable in minutes rather than hours.
export function middleware(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  const user = process.env.DASHBOARD_USER || 'authority';
  const pass = process.env.DASHBOARD_PASS || 'demo123';
  const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

  if (authHeader !== expected) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="SafeSignal Authority Dashboard"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/alerts/:path*', '/api/score/:path*', '/api/history/:path*'],
};
