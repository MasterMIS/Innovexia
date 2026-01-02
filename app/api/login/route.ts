import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

const createSessionId = (request: NextRequest) => {
  const headerId = request.headers.get('x-session-id')?.trim();
  if (headerId) return headerId;
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
};

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const users = await sql`SELECT * FROM users WHERE username = ${username}`;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const user = users[0];
    
    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
    
    let isPasswordValid = false;
    if (isHashed) {
      // Compare with bcrypt for hashed passwords
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // Direct comparison for plain text passwords (development only)
      isPasswordValid = password === user.password;
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const sessionId = createSessionId(request);

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
    };

    // Create response with auth cookie keyed by sessionId so tabs are isolated
    const response = NextResponse.json({
      success: true,
      sessionId,
      user: userData,
    });

    // Set httpOnly cookie per session to avoid cross-tab logout
    response.cookies.set(`auth-${sessionId}`, JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    response.headers.set('x-session-id', sessionId);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
