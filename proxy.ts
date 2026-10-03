import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next.js Edge-compatible SHA-256 hash generator
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, Next.js internal files, and the login page / auth verification API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Get active passcode from environment variable (fallback to secure default 'placehub2026')
  const secretPasscode = process.env.SITE_PASSCODE || 'placehub2026';
  const expectedToken = await sha256(secretPasscode + '_placerover_salt');

  // Check auth cookie
  const authCookie = request.cookies.get('placerover_session')?.value;

  if (!authCookie || authCookie !== expectedToken) {
    // If it's an API request, return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized. Passcode required.' }, { status: 401 });
    }

    // Otherwise redirect browser to login page
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
