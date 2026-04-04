import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';

  // On clientportal subdomain, rewrite /slug → /portal/slug
  if (hostname.startsWith('clientportal.')) {
    const pathname = request.nextUrl.pathname;
    // Skip internal paths
    if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/portal')) {
      return NextResponse.next();
    }
    const slug = pathname.replace(/^\//, '').split('/')[0];
    if (slug) {
      return NextResponse.rewrite(new URL(`/portal/${slug}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
