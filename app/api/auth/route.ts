import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id')?.trim();
    console.log('[Auth Debug] Headers Session ID:', sessionId);

    const cookieName = sessionId ? `auth-${sessionId}` : 'auth';
    console.log('[Auth Debug] Looking for cookie:', cookieName);

    const cookie = request.cookies.get(cookieName);
    console.log('[Auth Debug] Cookie found:', !!cookie);
    if (cookie) console.log('[Auth Debug] Cookie value length:', cookie.value.length);

    // Also check generic auth cookie for backward compatibility logic
    const genericCookie = request.cookies.get('auth');
    console.log('[Auth Debug] Generic auth cookie found:', !!genericCookie);

    const authCookie = cookie?.value || (!sessionId ? genericCookie?.value : undefined);

    if (!authCookie) {
      console.log('[Auth Debug] No auth cookie found - returning 401');
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    try {
      const user = JSON.parse(authCookie);
      console.log('[Auth Debug] User parsed successfully:', user.username);
      return NextResponse.json({
        authenticated: true,
        user,
      });
    } catch (error) {
      console.error('[Auth Debug] Error parsing auth cookie:', error);
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[Auth Debug] General error in auth route:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}
