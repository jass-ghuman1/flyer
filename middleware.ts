import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from './lib/auth';

const PUBLIC = ['/login', '/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith('/api/');

  if (!session) {
    if (isApi) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname !== '/' ? `?next=${encodeURIComponent(pathname + search)}` : '';
    return NextResponse.redirect(url);
  }

  const adminOnly = pathname.startsWith('/settings') || pathname.startsWith('/api/admin');
  if (adminOnly && session.r !== 'admin') {
    if (isApi) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '?denied=settings';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next's static build files. Fonts and other assets bundled by Next live under _next/static.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
