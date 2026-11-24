import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  checkLoginRateLimit,
  clearLoginAttempts,
  createSessionToken,
  recordFailedLogin,
  verifyPasswordTimingSafe,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'local';

    const limit = checkLoginRateLimit(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many failed login attempts. Please wait ${Math.ceil(
            limit.retryAfterSec / 60
          )} minute(s) and try again.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const password = String(body.password || '').trim();

    if (!password || !verifyPasswordTimingSafe(password)) {
      recordFailedLogin(ip);
      return NextResponse.json(
        { success: false, message: 'Invalid organizer password.' },
        { status: 401 }
      );
    }

    clearLoginAttempts(ip);
    const token = createSessionToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Login failed.' },
      { status: 400 }
    );
  }
}
