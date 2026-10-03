import { NextResponse } from 'next/server';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// POST: Verify passcode & set 30-day session cookie
export async function POST(request: Request) {
  try {
    const { passcode } = await request.json();

    const expectedPasscode = process.env.SITE_PASSCODE || 'placehub2026';

    if (!passcode || passcode.trim() !== expectedPasscode.trim()) {
      return NextResponse.json({ error: 'Incorrect Passcode. Access denied.' }, { status: 401 });
    }

    const sessionToken = await sha256(expectedPasscode + '_placerover_salt');

    const response = NextResponse.json({ success: true });

    // Set secure cookie lasting 30 days
    response.cookies.set('placerover_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 Days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Authentication error' }, { status: 500 });
  }
}

// DELETE: Logout (clear session cookie)
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('placerover_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
